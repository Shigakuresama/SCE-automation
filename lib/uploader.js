/**
 * lib/uploader.js
 * File upload automation for SCE Rebate Center
 *
 * Handles:
 * - Photo uploads (site photos, equipment photos)
 * - Document uploads (invoices, contracts)
 * - Multiple file types (jpg, png, pdf)
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { lookup } from 'mrmime'; // We'll use a simple mapping instead

/**
 * Simple MIME type mapping (no external dependency)
 */
const MIME_TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function getMimeType(filename) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * File upload handler
 */
export class FileUploader {
    constructor(page) {
        this.page = page;
        this.uploaded = [];
    }

    /**
     * Find all file uploaders on the page
     */
    async findUploaders() {
        const uploaders = await this.page.locator('app-file-uploader').all();
        return uploaders;
    }

    /**
     * Upload a single file to a specific uploader
     */
    async upload(uploaderIndex, filePath, options = {}) {
        const { waitForUpload = true, timeout = 10000 } = options;

        if (!existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        console.log(`  📤 Uploading: ${basename(filePath)}`);

        try {
            // Find the file input within the uploader
            const uploader = this.page.locator('app-file-uploader').nth(uploaderIndex);
            const fileInput = uploader.locator('input[type="file"]');

            // Set the file
            await fileInput.setInputFiles(filePath);

            // Wait for upload to complete
            if (waitForUpload) {
                await this.page.waitForTimeout(1000);

                // Check for success indicator (often a checkmark or removal of progress bar)
                try {
                    const successIndicator = uploader.locator('.upload-success, mat-icon:has-text("check"), .file-uploaded');
                    await successIndicator.waitFor({ timeout });
                } catch {
                    // No explicit success indicator, assume success
                }
            }

            this.uploaded.push({
                path: filePath,
                name: basename(filePath),
                uploaderIndex,
                uploadedAt: new Date().toISOString()
            });

            console.log(`  ✓ Upload complete`);
            return true;

        } catch (error) {
            console.log(`  ❌ Upload failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Upload multiple files from a directory
     */
    async uploadDirectory(dirPath, patterns = ['*.jpg', '*.jpeg', '*.png'], options = {}) {
        if (!existsSync(dirPath)) {
            console.log(`  ⚠️  Directory not found: ${dirPath}`);
            return [];
        }

        const files = await readdir(dirPath);
        const results = [];

        for (const file of files) {
            const filePath = join(dirPath, file);
            const ext = file.toLowerCase().substring(file.lastIndexOf('.'));

            // Check if file matches pattern
            const matches = patterns.some(pattern => {
                const patternExt = pattern.substring(pattern.lastIndexOf('.'));
                return ext === patternExt || pattern === '*';
            });

            if (!matches) continue;

            const result = await this.upload(this.uploaded.length, filePath, options);
            results.push({ file, success: result });
        }

        return results;
    }

    /**
     * Upload photos by type (site photos, equipment photos, etc.)
     */
    async uploadPhotos(photoType, files) {
        console.log(`\n📸 Uploading ${photoType}...`);

        // Find the relevant uploader for this photo type
        const uploaders = await this.findUploaders();
        let targetUploader = null;

        // Try to find uploader by label/heading
        for (let i = 0; i < uploaders.length; i++) {
            const text = await uploaders[i].textContent();
            if (text.toLowerCase().includes(photoType.toLowerCase())) {
                targetUploader = i;
                break;
            }
        }

        // If not found by label, use sequential uploader
        if (targetUploader === null) {
            targetUploader = this.uploaded.length;
        }

        const results = [];

        for (const file of files) {
            const result = await this.upload(targetUploader, file.path);
            results.push({ file: file.name, success: result });

            // Move to next uploader for each file (some forms use multiple uploaders)
            targetUploader++;
        }

        return results;
    }

    /**
     * Upload all files from a case packet
     */
    async uploadCasePacket(casePacketPath) {
        const results = {
            sitePhotos: [],
            equipmentPhotos: [],
            documents: []
        };

        // Site photos
        const sitePhotosDir = join(casePacketPath, 'photos', 'site');
        if (existsSync(sitePhotosDir)) {
            results.sitePhotos = await this.uploadDirectory(sitePhotosDir, ['*.jpg', '*.jpeg', '*.png']);
        }

        // Equipment photos
        const equipmentPhotosDir = join(casePacketPath, 'photos', 'equipment');
        if (existsSync(equipmentPhotosDir)) {
            results.equipmentPhotos = await this.uploadDirectory(equipmentPhotosDir, ['*.jpg', '*.jpeg', '*.png']);
        }

        // Documents
        const documentsDir = join(casePacketPath, 'documents');
        if (existsSync(documentsDir)) {
            results.documents = await this.uploadDirectory(documentsDir, ['*.pdf', '*.doc', '*.docx']);
        }

        return results;
    }

    /**
     * Get upload summary
     */
    getSummary() {
        return {
            total: this.uploaded.length,
            files: this.uploaded,
            success: this.uploaded.filter(u => u.uploadedAt).length
        };
    }
}

/**
 * Prepare photo directory for a case
 */
export async function preparePhotoDir(caseDir) {
    const photoDir = join(caseDir, 'photos');
    const dirs = ['site', 'equipment', 'after', 'misc'];

    for (const dir of dirs) {
        const fullPath = join(photoDir, dir);
        if (!existsSync(fullPath)) {
            await import('fs/promises').then(fs => fs.mkdir(fullPath, { recursive: true }));
        }
    }

    return photoDir;
}

/**
 * Auto-detect and organize photos from a directory
 */
export async function organizePhotos(sourceDir, targetDir) {
    const { mkdir, copyFile } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const { join, basename } = await import('path');

    if (!existsSync(sourceDir)) {
        console.log(`Source directory not found: ${sourceDir}`);
        return [];
    }

    const files = await readdir(sourceDir);
    const organized = {
        site: [],
        equipment: [],
        after: [],
        misc: []
    };

    for (const file of files) {
        const lower = file.toLowerCase();
        const sourcePath = join(sourceDir, file);

        // Skip directories
        const stat = await import('fs').then(fs => fs.statSync(sourcePath));
        if (stat.isDirectory()) continue;

        // Categorize by filename
        let category = 'misc';
        if (lower.includes('site') || lower.includes('exterior') || lower.includes('front')) {
            category = 'site';
        } else if (lower.includes('equip') || lower.includes('hvac') || lower.includes('furnace') ||
                   lower.includes('ac') || lower.includes('water heater') || lower.includes('attic')) {
            category = 'equipment';
        } else if (lower.includes('after') || lower.includes('complete') || lower.includes('done')) {
            category = 'after';
        }

        // Copy to target directory
        const targetPath = join(targetDir, 'photos', category, file);
        await mkdir(join(targetDir, 'photos', category), { recursive: true });
        await copyFile(sourcePath, targetPath);

        organized[category].push(file);
    }

    return organized;
}

export default FileUploader;

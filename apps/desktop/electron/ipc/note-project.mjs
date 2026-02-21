import { app, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const NOTE_FILE_NAME = 'note.md';
const PROJECT_META_FILE_NAME = 'project.json';

let noteDirty = false;
let currentProjectDir = null;

function getTempProjectDir() {
    return path.join(app.getPath('temp'), 'noa-studio-temp-project');
}

function isDefaultProjectDir(projectDir) {
    return projectDir === getTempProjectDir();
}

function getProjectMetaPath(projectDir) {
    return path.join(projectDir, PROJECT_META_FILE_NAME);
}

function buildProjectName() {
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `noa-project-${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function normalizeDirectoryName(rawName) {
    const normalized = String(rawName ?? '')
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\s+/g, '_');
    return normalized || buildProjectName();
}

function normalizeProjectTitle(rawName) {
    const normalized = String(rawName ?? '').trim();
    return normalized || '未保存项目';
}

function resolveSafeDirectoryPath(rawPath) {
    if (typeof rawPath !== 'string' || !rawPath.trim()) {
        throw new Error('invalid_save_path');
    }

    return path.resolve(rawPath.trim());
}

async function ensureTempProject() {
    const tempProjectDir = getTempProjectDir();
    const assetsDir = path.join(tempProjectDir, 'assets');
    const notePath = path.join(tempProjectDir, NOTE_FILE_NAME);
    const metaPath = path.join(tempProjectDir, PROJECT_META_FILE_NAME);

    await fs.mkdir(tempProjectDir, { recursive: true });
    await fs.mkdir(assetsDir, { recursive: true });

    try {
        await fs.access(notePath);
    } catch {
        await fs.writeFile(notePath, '', 'utf8');
    }

    try {
        await fs.access(metaPath);
    } catch {
        const nowIso = new Date().toISOString();
        await fs.writeFile(metaPath, JSON.stringify({
            title: '未保存项目',
            createdAt: nowIso,
            updatedAt: nowIso,
            noteFile: NOTE_FILE_NAME,
            assetsDir: 'assets',
            noteBytes: 0,
            videos: [],
            currentVideoId: null,
            resources: [],
        }, null, 2), 'utf8');
    }

    return tempProjectDir;
}

async function ensureCurrentProject() {
    if (!currentProjectDir) {
        currentProjectDir = await ensureTempProject();
    }

    await fs.mkdir(currentProjectDir, { recursive: true });
    await fs.mkdir(path.join(currentProjectDir, 'assets'), { recursive: true });
    const notePath = path.join(currentProjectDir, NOTE_FILE_NAME);
    const metaPath = getProjectMetaPath(currentProjectDir);

    try {
        await fs.access(notePath);
    } catch {
        await fs.writeFile(notePath, '', 'utf8');
    }

    try {
        await fs.access(metaPath);
    } catch {
        const nowIso = new Date().toISOString();
        await fs.writeFile(metaPath, JSON.stringify({
            title: isDefaultProjectDir(currentProjectDir) ? '未保存项目' : path.basename(currentProjectDir),
            createdAt: nowIso,
            updatedAt: nowIso,
            noteFile: NOTE_FILE_NAME,
            assetsDir: 'assets',
            noteBytes: 0,
            videos: [],
            currentVideoId: null,
            resources: [],
        }, null, 2), 'utf8');
    }

    return currentProjectDir;
}

async function readProjectMeta(projectDir) {
    const metaPath = getProjectMetaPath(projectDir);
    try {
        const rawMeta = await fs.readFile(metaPath, 'utf8');
        return JSON.parse(rawMeta);
    } catch {
        const nowIso = new Date().toISOString();
        return {
            title: isDefaultProjectDir(projectDir) ? '未保存项目' : path.basename(projectDir),
            createdAt: nowIso,
            updatedAt: nowIso,
            noteFile: NOTE_FILE_NAME,
            assetsDir: 'assets',
            noteBytes: 0,
            videos: [],
            currentVideoId: null,
            resources: [],
        };
    }
}

async function writeProjectMeta(projectDir, meta) {
    const metaPath = getProjectMetaPath(projectDir);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
}

export async function updateProjectMeta(mutator) {
    const projectDir = await ensureCurrentProject();
    const currentMeta = await readProjectMeta(projectDir);
    const nextMeta = mutator(currentMeta);
    await writeProjectMeta(projectDir, {
        ...nextMeta,
        updatedAt: new Date().toISOString(),
    });
}

export async function getCurrentProjectDir() {
    return ensureCurrentProject();
}

async function clearTempProject() {
    const tempProjectDir = getTempProjectDir();
    await fs.rm(tempProjectDir, { recursive: true, force: true });
}

export async function cleanupDefaultProjectOnClose() {
    if (!currentProjectDir) {
        noteDirty = false;
        return { cleaned: false };
    }

    if (!isDefaultProjectDir(currentProjectDir)) {
        noteDirty = false;
        return { cleaned: false };
    }

    await clearTempProject();
    currentProjectDir = null;
    noteDirty = false;
    return { cleaned: true };
}

export async function getTempNoteProjectState() {
    const projectDir = await ensureCurrentProject();
    const notePath = path.join(projectDir, NOTE_FILE_NAME);
    const meta = await readProjectMeta(projectDir);
    const projectName = typeof meta.title === 'string' && meta.title.trim().length > 0
        ? meta.title.trim()
        : (isDefaultProjectDir(projectDir) ? '未保存项目' : path.basename(projectDir));

    try {
        const content = await fs.readFile(notePath, 'utf8');
        return {
            projectPath: projectDir,
            notePath,
            content,
            dirty: noteDirty,
            projectName,
            isDefaultProject: isDefaultProjectDir(projectDir),
        };
    } catch {
        return {
            projectPath: projectDir,
            notePath,
            content: '',
            dirty: noteDirty,
            projectName,
            isDefaultProject: isDefaultProjectDir(projectDir),
        };
    }
}

export async function initializeTempNoteProject() {
    const tempProjectDir = await ensureTempProject();
    currentProjectDir = tempProjectDir;
    return {
        projectPath: tempProjectDir,
        notePath: path.join(tempProjectDir, NOTE_FILE_NAME),
        projectMetaPath: path.join(tempProjectDir, PROJECT_META_FILE_NAME),
    };
}

export async function saveTempNoteProject(payload) {
    const projectDir = await ensureCurrentProject();
    const notePath = path.join(projectDir, NOTE_FILE_NAME);
    const content = typeof payload?.content === 'string' ? payload.content : '';

    await fs.writeFile(notePath, content, 'utf8');
    await updateProjectMeta((meta) => ({
        ...meta,
        noteBytes: Buffer.byteLength(content, 'utf8'),
        noteFile: NOTE_FILE_NAME,
        assetsDir: 'assets',
    }));

    return {
        projectPath: projectDir,
        notePath,
        bytes: Buffer.byteLength(content, 'utf8'),
    };
}

export async function saveProjectAs(payload) {
    const projectDir = await ensureCurrentProject();
    const basePath = resolveSafeDirectoryPath(payload?.basePath);
    const directoryName = normalizeDirectoryName(payload?.directoryName);
    const projectName = normalizeProjectTitle(payload?.projectName);
    const targetProjectPath = path.join(basePath, directoryName);

    await fs.mkdir(targetProjectPath, { recursive: true });
    await fs.cp(projectDir, targetProjectPath, { recursive: true });

    currentProjectDir = targetProjectPath;
    await updateProjectMeta((currentMeta) => ({
        ...currentMeta,
        title: projectName,
    }));

    noteDirty = false;
    return {
        saved: true,
        canceled: false,
        projectPath: targetProjectPath,
        projectName,
    };
}

export async function listSaveDirectories(payload) {
    const currentPath = resolveSafeDirectoryPath(payload?.path ?? app.getPath('documents'));
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const directories = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            name: entry.name,
            path: path.join(currentPath, entry.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    const parentPath = path.dirname(currentPath);
    return {
        currentPath,
        parentPath: parentPath !== currentPath ? parentPath : null,
        directories,
    };
}

export async function createSaveDirectory(payload) {
    const basePath = resolveSafeDirectoryPath(payload?.basePath);
    const directoryName = normalizeDirectoryName(payload?.directoryName);
    const createdPath = path.join(basePath, directoryName);
    await fs.mkdir(createdPath, { recursive: true });
    return { createdPath };
}

export async function setProjectVideos(payload) {
    const videos = Array.isArray(payload?.videos)
        ? payload.videos
            .filter((item) => item && typeof item === 'object')
            .map((item) => ({
                id: typeof item.id === 'string' ? item.id : '',
                label: typeof item.label === 'string' ? item.label : '',
                sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : '',
            }))
            .filter((item) => item.id && item.sourceUrl)
        : [];
    const currentVideoId = typeof payload?.currentVideoId === 'string' ? payload.currentVideoId : null;

    await updateProjectMeta((meta) => ({
        ...meta,
        videos,
        currentVideoId,
    }));

    return {
        updated: true,
        count: videos.length,
    };
}

export function setNoteDirty(payload) {
    noteDirty = Boolean(payload?.dirty);
    return { dirty: noteDirty };
}

export async function confirmCloseWithNoteSave(window) {
    const projectDir = await ensureCurrentProject();

    if (!noteDirty) {
        return { shouldClose: true, saved: false, canceled: false, projectPath: '' };
    }

    const choice = await dialog.showMessageBox(window ?? undefined, {
        type: 'question',
        buttons: ['保存并退出', '不保存退出', '取消'],
        defaultId: 0,
        cancelId: 2,
        title: '保存笔记工程',
        message: '检测到未保存修改，是否另存当前工程后退出？',
        noLink: true,
    });

    if (choice.response === 2) {
        return { shouldClose: false, saved: false, canceled: true, projectPath: '' };
    }

    if (choice.response === 1) {
        noteDirty = false;
        if (isDefaultProjectDir(projectDir)) {
            await clearTempProject();
        }
        return { shouldClose: true, saved: false, canceled: false, projectPath: '' };
    }

    const saveResult = await saveProjectAs({
        basePath: app.getPath('documents'),
        directoryName: isDefaultProjectDir(projectDir) ? buildProjectName() : path.basename(projectDir),
        projectName: isDefaultProjectDir(projectDir) ? '未保存项目' : path.basename(projectDir),
    });
    if (saveResult.canceled) {
        return { shouldClose: false, saved: false, canceled: true, projectPath: '' };
    }

    noteDirty = false;
    if (isDefaultProjectDir(projectDir)) {
        await clearTempProject();
    }
    return {
        shouldClose: true,
        saved: true,
        canceled: false,
        projectPath: saveResult.projectPath,
    };
}

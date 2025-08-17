import { dialog } from 'electron';
import { runImporter } from '../import/importer';

export async function handleSelectFile(title: string, fileTypes: { name: string, extensions: string[] }[]) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title,
    properties: ['openFile'],
    filters: fileTypes,
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
}

export async function handleRunImport(mappingPath: string, dataPath: string) {
  if (!mappingPath || !dataPath) {
    throw new Error('مسار ملف التعيين وملف البيانات مطلوبان.');
  }
  return await runImporter(mappingPath, dataPath);
}

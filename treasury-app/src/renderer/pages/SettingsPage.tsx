import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ImportReport } from '@/main/import/importer';

const SettingsPage: React.FC = () => {
  const [mappingFilePath, setMappingFilePath] = useState<string | null>(null);
  const [dataFilePath, setDataFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectMappingFile = async () => {
    const path = await window.electronAPI.import.selectFile('اختر ملف التعيين', [{ name: 'YAML/JSON', extensions: ['yml', 'yaml', 'json'] }]);
    if (path) setMappingFilePath(path);
  };

  const handleSelectDataFile = async () => {
    const path = await window.electronAPI.import.selectFile('اختر ملف البيانات', [{ name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }]);
    if (path) setDataFilePath(path);
  };

  const handleRunImport = async () => {
    if (!mappingFilePath || !dataFilePath) return;
    setIsLoading(true);
    setError(null);
    setImportReport(null);
    try {
      const report = await window.electronAPI.import.run(mappingFilePath, dataFilePath);
      setImportReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">استيراد البيانات</h2>
        <div className="space-y-4">
            <div>
                <Label>1. اختر ملف خريطة الحقول (Mapping)</Label>
                <div className="flex items-center gap-4 mt-2">
                    <Button onClick={handleSelectMappingFile} variant="outline">اختر ملف...</Button>
                    <p className="text-sm text-gray-500">{mappingFilePath || 'لم يتم اختيار ملف'}</p>
                </div>
            </div>
            <div>
                <Label>2. اختر ملف البيانات (Excel/CSV)</Label>
                 <div className="flex items-center gap-4 mt-2">
                    <Button onClick={handleSelectDataFile} variant="outline">اختر ملف...</Button>
                    <p className="text-sm text-gray-500">{dataFilePath || 'لم يتم اختيار ملف'}</p>
                </div>
            </div>
            <div>
                <Button onClick={handleRunImport} disabled={!mappingFilePath || !dataFilePath || isLoading}>
                    {isLoading ? 'جاري الاستيراد...' : 'بدء عملية الاستيراد'}
                </Button>
            </div>
        </div>

        {error && (
            <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                <h3 className="font-bold">فشل الاستيراد</h3>
                <p>{error}</p>
            </div>
        )}

        {importReport && (
            <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
                <h3 className="font-bold">اكتمل الاستيراد</h3>
                <ul className="list-disc list-inside">
                    <li>إجمالي السجلات في الملف: {importReport.totalRows}</li>
                    <li>تم استيراد بنجاح: {importReport.importedCount}</li>
                    <li>تم تخطيها (مكررة أو خطأ): {importReport.skippedCount}</li>
                </ul>
                {importReport.errors.length > 0 && (
                    <div className="mt-2">
                        <h4 className="font-semibold">تفاصيل الأخطاء:</h4>
                        <pre className="text-xs bg-gray-100 p-2 rounded max-h-40 overflow-auto">
                            {importReport.errors.map(e => `Row ${e.row}: ${e.message}\nData: ${JSON.stringify(e.data)}`).join('\n\n')}
                        </pre>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

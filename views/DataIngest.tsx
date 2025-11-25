
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, Link as LinkIcon, DownloadCloud } from 'lucide-react';
import { parseExcelFile, parseCsvUrl, inferColumns } from '../utils/excel';
import { Project, ProjectTab, RawRow } from '../types';
import { saveProject } from '../utils/storage';
import { useToast } from '../components/ToastProvider';
import { useDataLibrary } from '../components/DataLibraryContext';

interface DataIngestProps {
  project: Project;
  onUpdateProject: (p: Project) => void;
  onNavigate: (tab: ProjectTab) => void;
}

const DataIngest: React.FC<DataIngestProps> = ({ project, onUpdateProject, onNavigate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const { registerAsset } = useDataLibrary();
  
  // New state for URL import
  const [importMode, setImportMode] = useState<'file' | 'url'>('file');
  const [sheetUrl, setSheetUrl] = useState('');

  const processData = async (newData: RawRow[]) => {
      if (newData.length === 0) {
        throw new Error("The dataset appears to be empty.");
      }
      
      const updatedData = [...project.data, ...newData];
      
      // If columns aren't defined yet, define them from the first row of new data
      let updatedColumns = project.columns;
      if (updatedColumns.length === 0 && newData.length > 0) {
        updatedColumns = inferColumns(newData[0]);
      } else if (newData.length > 0) {
        // Merge new columns if any
        const newCols = inferColumns(newData[0]);
        newCols.forEach(nc => {
            if (!updatedColumns.find(c => c.key === nc.key)) {
                updatedColumns.push(nc);
            }
        });
      }

      const updatedProject = {
        ...project,
        data: updatedData,
        columns: updatedColumns,
        lastModified: Date.now()
      };

      await saveProject(updatedProject);
      onUpdateProject(updatedProject);

      await registerAsset({
        id: `raw-${project.id}`,
        name: 'Raw Dataset',
        description: 'ข้อมูลดิบล่าสุดพร้อมให้ทุกฟีเจอร์เรียกใช้',
        source: ProjectTab.UPLOAD,
        rowCount: updatedData.length,
        schema: updatedColumns.map((col) => col.key),
        tags: ['raw', 'ingest'],
      });

      showToast('Import Successful', `Added ${newData.length} rows to the project and Library.`, 'success');
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsLoading(true);
    const file = files[0];

    try {
      if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
        throw new Error("Invalid file format. Please upload an Excel or CSV file.");
      }
      const newData = await parseExcelFile(file);
      await processData(newData);
    } catch (err: any) {
      console.error(err);
      showToast('Import Failed', err.message || "Failed to process file.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlImport = async () => {
      if (!sheetUrl) return;
      setIsLoading(true);
      try {
          const newData = await parseCsvUrl(sheetUrl);
          await processData(newData);
          setSheetUrl('');
      } catch (err: any) {
          console.error(err);
          showToast('Link Import Failed', "Ensure the link is a direct CSV or published Google Sheet CSV link.", 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Data Sources</h2>
        <p className="text-gray-500">Import your social listening data.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
          <button 
            onClick={() => setImportMode('file')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'file' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
             <div className="flex items-center space-x-2">
                 <UploadCloud className="w-4 h-4" />
                 <span>Upload File</span>
             </div>
          </button>
          <button 
            onClick={() => setImportMode('url')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importMode === 'url' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
             <div className="flex items-center space-x-2">
                 <LinkIcon className="w-4 h-4" />
                 <span>Google Sheets / CSV Link</span>
             </div>
          </button>
      </div>

      {importMode === 'file' ? (
        <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out ${
            isDragging 
                ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            } bg-white`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {isLoading ? (
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                ) : (
                    <UploadCloud className="w-10 h-10 text-blue-600" />
                )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isLoading ? 'Processing Data...' : 'Drag & Drop your file here'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
            Supports .xlsx, .xls, .csv. Data will be appended to existing records.
            </p>

            {!isLoading && (
                <div className="relative inline-block">
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors">
                    Browse Files
                </button>
                </div>
            )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import from URL</h3>
            <p className="text-gray-500 text-sm mb-6">
                Paste a direct link to a CSV file or a <strong>published Google Sheet CSV link</strong>.
                <br/><span className="text-xs text-gray-400">For Google Sheets: File {'>'} Share {'>'} Publish to web {'>'} Select 'CSV'</span>
            </p>
            
            <div className="flex space-x-3">
                <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <button 
                    onClick={handleUrlImport}
                    disabled={isLoading || !sheetUrl}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center"
                >
                    {isLoading ? 'Loading...' : <><DownloadCloud className="w-4 h-4 mr-2" /> Import</>}
                </button>
            </div>
        </div>
      )}

      {/* Success Banner / Stats */}
      {project.data.length > 0 && !isLoading && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between text-green-800 animate-fade-in-up">
          <div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-3" />
              <span>Dataset ready with <strong>{project.data.length}</strong> rows.</span>
            </div>
            <p className="text-xs text-green-700 mt-1">เผยแพร่ลง Data Library แล้ว สามารถเปิดใช้งานในทุกแท็บได้ทันที</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate(ProjectTab.PREP)}
              className="text-sm font-semibold underline hover:text-green-900"
            >
              เปิด Clean & Prep
            </button>
            <button
              onClick={() => onNavigate(ProjectTab.VISUALIZE)}
              className="text-sm font-semibold underline hover:text-green-900"
            >
              วิเคราะห์ทันที
            </button>
          </div>
        </div>
      )}

      {/* Current Data Summary */}
      <div className="mt-12">
         <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-gray-500" />
            Current Dataset Status
         </h4>
         <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm uppercase font-medium">Total Rows</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{project.data.length.toLocaleString()}</p>
                </div>
                <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm uppercase font-medium">Columns</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{project.columns.length}</p>
                </div>
                <div className="p-6 text-center">
                    <p className="text-gray-500 text-sm uppercase font-medium">Last Upload</p>
                    <p className="text-lg font-semibold text-gray-900 mt-3">
                        {new Date(project.lastModified).toLocaleDateString()}
                    </p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DataIngest;

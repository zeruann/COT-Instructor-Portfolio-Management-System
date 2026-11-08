// client/src/components/documentActions/UploadModal.jsx
import { useState, useRef } from 'react';
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../../api/documents';

// Biggest file allowed (MB). The server enforces the same limit in constants/uploadRules.js.
const MAX_FILE_MB = 5;

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function UploadModalContent({
  onClose,
  onSuccess,
  requirement,
  existingDoc,
  slot,
}) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Initialize meta from existingDoc or requirement schema
  const [meta, setMeta] = useState(() => {
    if (existingDoc && existingDoc.meta) {
      return { ...existingDoc.meta };
    }
    const initialMeta = {};
    if (requirement?.metaFields) {
      requirement.metaFields.forEach((field) => {
        initialMeta[field.name] = '';
      });
    }
    if (!requirement?.multiple && requirement?.label) {
      initialMeta.name = requirement.label;
    }
    return initialMeta;
  });

  const acceptedExts =
    '.pdf, .jpg, .jpeg, .png, .webp, .doc, .docx, .xls, .xlsx, .csv, application/pdf, image/jpeg, image/png, image/webp, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv';

  const handleFileSelect = (selectedFile) => {
    setError('');
    if (!selectedFile) return;

    if (selectedFile.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File size exceeds the ${MAX_FILE_MB} MB limit.`);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    if (requirement?.metaFields) {
      for (const field of requirement.metaFields) {
        if (field.required && !meta[field.name]?.trim()) {
          setError(`"${field.label}" is required.`);
          return;
        }
      }
    }

    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      const res = await uploadDocument({
        file,
        requirementKey: requirement?.key,
        documentId: existingDoc?._id,
        meta,
        slot,
        classIds: requirement?.classIds,
        academicPeriodId: requirement?.academicPeriodId,
        onProgress: (p) => setUploadProgress(p),
      });

      if (onSuccess) {
        onSuccess(res.document);
      }
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const currentVer =
    existingDoc?.versions?.find((v) => v.n === existingDoc.currentVersion) ||
    existingDoc?.versions?.[existingDoc?.versions?.length - 1];
  const existingFileName = currentVer?.originalName;
  const existingFileSize = currentVer?.size;

  //EDIT: MODAL TITLE
  const modalTitle = existingDoc
    ? `Reupload: ${existingDoc.meta?.name || existingDoc.meta?.title || requirement?.label || 'Document'}`
    : `Upload: ${requirement?.label || requirement?.card || 'Document'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}

        {/* MODAL TITLE AND DESCRIPTION */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-700 break-words text-[17px] pt-3 pb-1">{modalTitle}</h3>
            <p className="text-s leading-5 text-gray-500 whitespace-normal break-words text-[13px]">
              {existingDoc ? '' : (requirement?.card || 'Faculty Portfolio')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 shrink-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition text-[10px]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Dynamic Meta Fields */}
          {requirement?.metaFields && requirement.metaFields.length > 0 ? (
            <div className="space-y-3">
              {requirement.metaFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={meta[field.name] || ''}
                      onChange={(e) => setMeta({ ...meta, [field.name]: e.target.value })}
                      required={field.required}
                      className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
                    >
                      <option value="">Select {field.label}...</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      value={meta[field.name] || ''}
                      onChange={(e) => setMeta({ ...meta, [field.name]: e.target.value })}
                      required={field.required}
                      className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
                    />
                  ) : field.type === 'longtext' ? (
                    <textarea
                      rows={2}
                      value={meta[field.name] || ''}
                      onChange={(e) => setMeta({ ...meta, [field.name]: e.target.value })}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      required={field.required}
                      className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
                    />
                  ) : (
                    <input
                      type={field.type === 'url' ? 'url' : 'text'}
                      value={meta[field.name] || ''}
                      onChange={(e) => setMeta({ ...meta, [field.name]: e.target.value })}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      required={field.required}
                      className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : requirement?.multiple ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title / Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={meta.name || ''}
                  onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                  placeholder={`e.g. ${requirement?.label ? `College of Technology ${requirement.label}` : 'College of Technology Service Record'}`}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={meta.date || ''}
                  onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-purple"
                />
              </div>
            </div>
          ) : null}

          {/* Drag & Drop File Zone */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              File Attachment <span className="text-red-500">*</span>
            </label>

            {existingFileName && !file && (
              <div className="mb-2.5 p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-purple-200 flex items-center justify-center text-brand-purple shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-500">Current file on record:</p>
                    <p className="font-semibold text-gray-800 truncate" title={existingFileName}>
                      {existingFileName}
                      {existingFileSize ? (
                        <span className="text-gray-400 font-normal ml-1">({formatFileSize(existingFileSize)})</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-brand-purple bg-purple-100/70 px-2 py-0.5 rounded-md shrink-0 ml-2">
                  v{existingDoc.currentVersion || 1}
                </span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e.target.files[0])}
              accept={acceptedExts}
              className="hidden"
            />

            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${isDragging
                  ? 'border-brand-purple bg-purple-50/50'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-50'
                  }`}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-brand-purple">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    {existingFileName ? 'Select new file to replace' : 'Click to browse'}{' '}
                    <span className="text-gray-400 font-normal">or drag & drop</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    PDF, Word (DOCX), Excel (XLSX, CSV), Images (Max {MAX_FILE_MB} MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 border border-purple-200 bg-purple-50/40 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white border border-purple-200 flex items-center justify-center text-brand-purple shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">


                    <p className="mt-1 whitespace-normal break-words text-xs leading-5 text-gray-500" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-brand-purple hover:underline shrink-0 ml-3"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Uploading to Google Drive...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-brand-purple h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-brand-purple hover:bg-opacity-90 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition"
            >
              {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {uploading ? 'Uploading...' : existingDoc ? 'Reupload File' : 'Submit Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UploadModal(props) {
  if (!props.isOpen) return null;
  return <UploadModalContent {...props} />;
}
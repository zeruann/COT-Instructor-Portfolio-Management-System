import { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  CheckSquare,
  Lock,
} from 'lucide-react';
import PreviewModal from '../../components/documentActions/PreviewModal';
import { CLASS_REQUIREMENT_CARDS } from './ViewClassPortfolio';
import { fetchClassById } from '../../api/classes';
import { fetchDocuments, uploadDocument } from '../../api/documents';

export default function ClassRequirementUpload({ reqConfig, classData: propClassData, onDone }) {
  const params = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const classId = params.id;
  const reqPath = params.reqPath;

  // Use props if embedded, otherwise find from route
  const resolvedReq = reqConfig || CLASS_REQUIREMENT_CARDS.find((r) => r.path === reqPath) || {
    key: `CLASS_${reqPath?.toUpperCase().replace(/-/g, '_')}`,
    ref: 'A 1.0',
    title: 'A 1.0 Instructional Load Report',
    description: 'Instructional Load Report',
    path: reqPath,
  };

  const [classData, setClassData] = useState(propClassData || null);
  const [existingDoc, setExistingDoc] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Load class info and current document for this requirement
  const loadClassAndDoc = async () => {
    try {
      if (classId && !classData) {
        const cData = await fetchClassById(classId);
        if (cData?.class) {
          setClassData(cData.class);
        }
      }

      // Check for uploaded document for this requirement & class
      const docs = await fetchDocuments({
        requirementKey: resolvedReq.key,
        classId: classId,
      });

      if (docs && docs.length > 0) {
        setExistingDoc(docs[0]);
      } else {
        setExistingDoc(null);
      }
    } catch (err) {
      console.warn('Failed to fetch class requirement doc:', err);
    }
  };

  useEffect(() => {
    loadClassAndDoc();
  }, [classId, resolvedReq.key]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10 MB limit.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setFile(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
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
    if (!file) return;

    try {
      setUploading(true);
      setErrorMessage('');
      setUploadProgress(0);

      await uploadDocument({
        file,
        requirementKey: resolvedReq.key,
        documentId: existingDoc?._id,
        academicPeriodId: classData?.academicPeriod?._id || classData?.academicPeriod,
        classIds: [classId],
        onProgress: (pct) => setUploadProgress(pct),
      });

      setSuccessMessage('Document uploaded successfully!');
      setFile(null);
      await loadClassAndDoc();
      if (onDone) onDone();
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (onDone) {
      onDone();
    } else {
      navigate(`/instructors/class-portfolio/${classId}`);
    }
  };

  const statusLabel = existingDoc?.status
    ? existingDoc.status === 'approved'
      ? 'Approved'
      : existingDoc.status === 'pending_review'
        ? 'Pending Review'
        : 'Needs Revision'
    : 'Not Yet Submitted';

  const currentFileName =
    existingDoc?.versions?.find((v) => v.n === existingDoc.currentVersion)?.originalName ||
    existingDoc?.versions?.[0]?.originalName;

  const backPath = isAdmin
    ? `/admin/class-portfolio/${classId}`
    : `/instructors/class-portfolio/${classId}`;

  const isArchived = Boolean(
    classData?.archivedAt ||
    classData?.academicPeriod?.isArchived ||
    classData?.academicPeriod?.status === 'Archived'
  );

  // If Archived (and not admin reviewing), show preserved read-only UI
  if (isArchived && !isAdmin) {
    return (
      <div className="space-y-6 w-full">
        {/* Top Title Bar with Back Arrow */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={backPath}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/10 transition cursor-pointer"
            aria-label="Back to Class Portfolio"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-purple tracking-tight">
            {resolvedReq.title}
          </h1>
          <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-500">
            {statusLabel}
          </span>
        </div>

        {/* Read-Only Notice Banner */}
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs sm:text-sm text-brand-purple font-medium">
          <Lock size={15} className="shrink-0 text-brand-purple" />
          <span>
            This requirement belongs to an archived academic record. All documents are preserved in read-only mode for audit &amp; compliance.
          </span>
        </div>

        {/* Document Display Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-bold text-brand-purple">Preserved Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              Archived evidence on record for this requirement.
            </p>
          </div>

          <div className="mt-6">
            {existingDoc ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-brand-purple shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 break-all">
                      {currentFileName || 'Submitted Document'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Status: <span className="font-semibold text-gray-700 capitalize">{existingDoc.status?.replace('_', ' ') || 'Submitted'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-opacity-90 transition cursor-pointer"
                  >
                    <Eye size={16} />
                    <span>View Document</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <AlertCircle size={36} className="mb-2 text-gray-300" />
                <p className="text-base font-semibold text-gray-600">No document was submitted</p>
                <p className="text-xs mt-1 text-gray-400">This requirement has no archived evidence on file.</p>
              </div>
            )}
          </div>
        </div>

        {existingDoc && (
          <PreviewModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            document={existingDoc}
            isAdmin={false}
          />
        )}
      </div>
    );
  }

  // If Admin, show review-only UI
  if (isAdmin) {
    return (
      <div className="space-y-6 w-full">
        {/* Top Title Bar with Back Arrow */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={backPath}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/10 transition cursor-pointer"
            aria-label="Back to Class Portfolio"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-purple tracking-tight">
            {resolvedReq.title}
          </h1>
          <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-500">
            {statusLabel}
          </span>
        </div>

        {/* Review Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-xl font-bold text-brand-purple">Requirement Evidence</h2>
            <p className="mt-1 text-sm text-gray-400">
              Review submitted document evidence and provide feedback or approval.
            </p>
          </div>

          <div className="mt-6">
            {existingDoc ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-brand-orange shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 break-all">
                      {currentFileName || 'Submitted Document'}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Status: <span className="font-semibold text-gray-700 capitalize">{existingDoc.status?.replace('_', ' ') || 'Submitted'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer"
                  >
                    <CheckSquare size={16} />
                    <span>Review Document</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <AlertCircle size={36} className="mb-2 text-gray-300" />
                <p className="text-base font-semibold text-gray-600">No document submitted yet</p>
                <p className="text-xs mt-1 text-gray-400">The instructor has not uploaded any evidence for this requirement.</p>
              </div>
            )}
          </div>
        </div>

        {existingDoc && (
          <PreviewModal
            isOpen={previewOpen}
            onClose={() => setPreviewOpen(false)}
            document={existingDoc}
            isAdmin={true}
            onReviewSuccess={() => {
              loadClassAndDoc();
              setPreviewOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Top Title Bar with Back Arrow */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/instructors/class-portfolio/${classId}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-purple text-brand-purple hover:bg-brand-purple/10 transition cursor-pointer"
          aria-label="Back to Class Portfolio"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-brand-purple tracking-tight">
          {resolvedReq.title}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-500">
          {statusLabel}
        </span>
      </div>

      {/* Main Upload Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs">
        {/* Card Header */}
        <div className="border-b border-gray-100 pb-5">
          <h2 className="text-xl font-bold text-brand-purple">Upload document</h2>
          <p className="mt-1 text-sm text-gray-400">
            Choose a file to submit as evidence for this requirement.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Replacement document section */}
          <div>
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-brand-purple mb-2">
              <span>{existingDoc ? 'Replacement document' : 'Select document'}</span>
              <span className="font-normal text-gray-400">
                {file ? file.name : 'No file selected'}
              </span>
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 px-6 text-center transition cursor-pointer ${
                isDragging
                  ? 'border-brand-purple bg-purple-50/50'
                  : 'border-purple-200 bg-white hover:border-brand-purple/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xls,.xlsx,.csv"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-brand-purple mb-3">
                <Plus size={20} />
              </div>

              <p className="text-base font-semibold text-brand-purple">
                Drag and drop your document here
              </p>
              <p className="mt-1 text-xs text-gray-400">
                or <span className="underline hover:text-brand-purple">browse files</span> · PDF, up to 10 MB
              </p>

              {file && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-purple-50 px-3.5 py-2 text-xs font-medium text-brand-purple">
                  <FileText size={16} />
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="ml-2 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Existing evidence notice */}
          <div>
            <h3 className="text-sm font-semibold text-brand-purple mb-2">Existing evidence</h3>
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-xs sm:text-sm text-gray-500">
              <AlertCircle size={18} className="shrink-0 text-brand-purple mt-0.5" />
              <div>
                {currentFileName ? (
                  <span>
                    Current file on record:{' '}
                    <strong>{currentFileName}</strong>. Uploading a replacement will update this submission.
                  </span>
                ) : (
                  <span>
                    This requirement has no evidence yet. Uploading will add this file as the first submission.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload progress bar */}
          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-brand-orange transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {file
                ? `Ready to upload: ${file.name}`
                : existingDoc
                  ? 'Select a file to replace existing evidence.'
                  : 'Select a file to enable upload. Nothing has been submitted yet.'}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!file || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-orange-600 transition cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    <span>{existingDoc ? 'Replace evidence' : 'Upload'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


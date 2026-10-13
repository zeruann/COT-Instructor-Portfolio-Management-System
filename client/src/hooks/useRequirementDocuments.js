// client/src/hooks/useRequirementDocuments.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  fetchDocuments,
  fetchRequirement,
  deleteDocument as apiDeleteDocument,
} from '../api/documents';

export function useRequirementDocuments({ requirementKey }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Role detection based on URL or session
  const isAdmin = location.pathname.startsWith('/admin');
  const instructorIdFromUrl = searchParams.get('instructorId');

  const [documents, setDocuments] = useState([]);
  const [requirement, setRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Load requirement definition and documents
  const loadData = useCallback(() => {
    let isCurrent = true;

    // Fetch requirement info
    if (requirementKey) {
      fetchRequirement(requirementKey)
        .then((reqData) => {
          if (isCurrent) setRequirement(reqData);
        })
        .catch((reqErr) => {
          console.warn('Could not fetch requirement definition:', reqErr);
        });
    }

    // Fetch documents
    const params = {};
    if (requirementKey) params.requirementKey = requirementKey;
    if (isAdmin && instructorIdFromUrl) {
      params.instructorId = instructorIdFromUrl;
    }

    fetchDocuments(params)
      .then((docs) => {
        if (isCurrent) {
          setDocuments(docs || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error('Failed to load requirement documents:', err);
          setError(err.response?.data?.message || err.message || 'Failed to load data.');
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [requirementKey, isAdmin, instructorIdFromUrl]);

  useEffect(() => {
    const cancel = loadData();
    return cancel;
  }, [loadData]);

  // Compute summary stats for the top compliance cards
  const summary = useMemo(() => {
    const counts = {
      approved: documents.filter((d) => d.status === 'approved').length,
      pendingReview: documents.filter((d) => d.status === 'pending_review').length,
      rejected: documents.filter((d) => d.status === 'rejected').length,
      notSubmitted: documents.filter((d) => d.status === 'draft').length,
    };
    const total = documents.length;
    const percent = total ? Math.round((counts.approved / total) * 100) : 0;
    return { counts, total, percent };
  }, [documents]);

  // Modal open helpers
  const openUpload = useCallback((docToReplace = null) => {
    setSelectedDoc(docToReplace);
    setUploadModalOpen(true);
  }, []);

  const openPreview = useCallback((doc) => {
    setSelectedDoc(doc);
    setPreviewModalOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setUploadModalOpen(false);
    setPreviewModalOpen(false);
    setSelectedDoc(null);
  }, []);

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document entry?')) {
      return;
    }
    try {
      await apiDeleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document.');
    }
  };

  const onUploadSuccess = (savedDoc) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d._id === savedDoc._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedDoc;
        return next;
      }
      return [savedDoc, ...prev];
    });
  };

  const onReviewSuccess = (reviewedDoc) => {
    setDocuments((prev) =>
      prev.map((d) => (d._id === reviewedDoc._id ? reviewedDoc : d))
    );
  };

  return {
    documents,
    requirement,
    loading,
    error,
    isAdmin,
    canUpload: !isAdmin,
    summary,
    uploadModalOpen,
    previewModalOpen,
    selectedDoc,
    openUpload,
    openPreview,
    closeModals,
    handleDelete,
    onUploadSuccess,
    onReviewSuccess,
    refetch: loadData,
  };
}

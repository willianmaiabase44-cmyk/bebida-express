// ============================================================
// uploadService.js — Upload de imagens via API /server
// ============================================================
// Substitui o UploadPublicFile do Base44.
// Requer autenticação de administrador (aplicada no backend).
// ============================================================

import { apiRequest } from '@/lib/apiClient';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiRequest('/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Erro ao enviar arquivo');
  }
  return res.json();
}
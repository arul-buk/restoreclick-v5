import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../app/api/upload-temporary-images/route';
import { storageService } from '../lib/storage/storage-service';
import { v4 as uuidv4 } from 'uuid';

// Mock external dependencies
vi.mock('../lib/storage/storage-service', () => ({
  storageService: {
    uploadTemporary: vi.fn(),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

// Helper to create a mock File object
const createMockFile = (name: string, type: string, size: number): File => {
  return new File([new ArrayBuffer(size)], name, { type });
};

describe('POST /api/upload-temporary-images', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(uuidv4).mockReturnValue('mock-session-id');
  });

  it('should successfully upload temporary images', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 100);
    const mockFormData = new FormData();
    mockFormData.append('files', mockFile);
    mockFormData.append('customerEmail', 'test@example.com');

    const mockRequest = {
      formData: async () => mockFormData,
    } as NextRequest;

    vi.mocked(storageService.uploadTemporary).mockResolvedValueOnce([
      {
        id: 'mock-upload-id-1',
        sessionId: 'mock-session-id',
        storagePath: 'uploads/temp/mock-session-id/mock-file-1.jpg',
        publicUrl: 'http://example.com/mock-file-1.jpg',
        fileSize: mockFile.size,
      },
    ]);

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.sessionId).toBe('mock-session-id');
    expect(jsonResponse.uploadCount).toBe(1);
    expect(jsonResponse.uploads).toHaveLength(1);
    expect(jsonResponse.uploads[0].publicUrl).toBe('http://example.com/mock-file-1.jpg');
    expect(storageService.uploadTemporary).toHaveBeenCalledWith(
      'mock-session-id',
      [mockFile],
      'test@example.com'
    );
  });

  it('should return 400 if no files are received', async () => {
    const mockFormData = new FormData();
    const mockRequest = {
      formData: async () => mockFormData,
    } as NextRequest;

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.error).toBe('No files received');
    expect(storageService.uploadTemporary).not.toHaveBeenCalled();
  });

  it('should return 400 if file size exceeds limit', async () => {
    const mockFile = createMockFile('large.png', 'image/png', 15 * 1024 * 1024); // 15MB
    const mockFormData = new FormData();
    mockFormData.append('files', mockFile);

    const mockRequest = {
      formData: async () => mockFormData,
    } as NextRequest;

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.error).toContain('exceeds 10MB limit');
    expect(storageService.uploadTemporary).not.toHaveBeenCalled();
  });

  it('should return 400 if file type is not allowed', async () => {
    const mockFile = createMockFile('document.pdf', 'application/pdf', 1024);
    const mockFormData = new FormData();
    mockFormData.append('files', mockFile);

    const mockRequest = {
      formData: async () => mockFormData,
    } as NextRequest;

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.error).toContain('unsupported format');
    expect(storageService.uploadTemporary).not.toHaveBeenCalled();
  });

  it('should return 500 if storage service fails', async () => {
    const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 100);
    const mockFormData = new FormData();
    mockFormData.append('files', mockFile);

    const mockRequest = {
      formData: async () => mockFormData,
    } as NextRequest;

    vi.mocked(storageService.uploadTemporary).mockRejectedValueOnce(new Error('Storage error'));

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.error).toBe('Failed to upload images to storage');
  });
});

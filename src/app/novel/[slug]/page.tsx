'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getNovel, getCurrentChapter, listChapters, removeNovel, exportNovel } from '@/lib/indexedDB';
import { Novel, ChapterInfo } from '@/types';
import Image from 'next/image';
import { HomeIcon, TrashIcon, DownloadIcon } from '@/lib/icons';
import PageLayout from '@/components/PageLayout';
import { NavButton } from '@/components/NavButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function NovelPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [currentChapterSlug, setCurrentChapterSlug] = useState<string | null>(null);
  const [currentChapterName, setCurrentChapterName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadNovel = async () => {
      const n = await getNovel(slug);
      setNovel(n);
      const chaptersList = await listChapters(slug);
      setChapters(chaptersList);
      const currentSlug = await getCurrentChapter(slug);
      const currentChapterName = currentSlug ?
        chaptersList?.find(c => c.chapter.slug === currentSlug)?.chapter.name || null
        : null;
      setCurrentChapterSlug(currentSlug);
      setCurrentChapterName(currentChapterName);
      setIsLoading(false);
    };
    loadNovel();
  }, [slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDeleteNovel = async () => {
    if (!novel) return;
    setIsDeleting(true);
    try {
      await removeNovel(slug);
      router.push('/');
    } catch (error) {
      console.error('Failed to remove novel:', error);
      alert('Failed to remove novel. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleExportNovel = async () => {
    if (!novel) return;
    try {
      const exportedNovel = await exportNovel(slug);
      if (!exportedNovel) {
        alert('Failed to export novel.');
        return;
      }

      // Create a blob and download it
      const json = JSON.stringify(exportedNovel, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.book.slug}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export novel:', error);
      alert('Failed to export novel. Please try again.');
    }
  };

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {isLoading ? (
            <p className="text-gray-500">Loading novel...</p>
          ) : (
            <p className="text-red-500">Novel not found.</p>
          )}
          <br />
          <Link href="/" className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            <HomeIcon />
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Novel Details</h1>
        <div className="flex gap-2">
          <NavButton
            label="Export"
            icon={<DownloadIcon />}
            onClick={handleExportNovel}
            ariaLabel="Export novel"
            className="bg-green-500 hover:bg-green-600 active:bg-green-700 focus:bg-green-700"
          />
          <NavButton
            label="Remove Novel"
            icon={<TrashIcon />}
            onClick={() => setShowDeleteDialog(true)}
            ariaLabel="Remove novel"
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 focus:bg-red-700"
          />
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <HomeIcon />
            Home
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Remove Novel"
        message={
          <>
            Are you sure you want to remove <strong>{novel.book.name}</strong>? This action cannot be undone.
          </>
        }
        confirmText="Remove Novel"
        cancelText="Cancel"
        isProcessing={isDeleting}
        processingText="Removing..."
        onConfirm={handleDeleteNovel}
        onCancel={() => setShowDeleteDialog(false)}
        variant="danger"
      />

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="flex-shrink-0">
            <Image
              src={novel.book.coverUrl}
              alt={novel.book.name}
              width={200}
              height={300}
              className="w-48 h-72 object-cover rounded-lg shadow-md hover:opacity-90 transition-opacity duration-200"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold mb-4 line-clamp-2">{novel.book.name}</h1>
            <p className="text-xl text-gray-600 mb-4">by {novel.book.author.name}</p>
            <div className="mb-6">
              <span className="text-lg text-gray-500">
                {novel.book.chapterCount} chapters
                {currentChapterSlug && (
                  <span className="ml-4 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    📖 Current: {currentChapterName || ''}
                  </span>
                )}
              </span>
            </div>
            <Link
              href={currentChapterSlug ? `/novel/${slug}/chapter/${currentChapterSlug}` : `/novel/${slug}/chapter/${chapters[0]?.chapter.slug || ''}`}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-white font-semibold text-lg transition-colors w-fit ${
                currentChapterSlug
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {currentChapterSlug ? '📖 Continue Reading' : '🎯 Start Reading'}
            </Link>
          </div>
        </div>

        {chapters && chapters.length > 0 && (
          <div className="mt-4">
            <div className="mb-3">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chapters..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <h2 className="text-lg font-bold mb-2">Chapters</h2>
            <div className="space-y-0.5">
              {chapters
                .filter((chapterInfo) =>
                  chapterInfo.chapter.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .slice(0, searchTerm ? undefined : 10)
                .map((chapterInfo) => {
                  const actualIndex = chapters.findIndex(c => c.chapter.slug === chapterInfo.chapter.slug) ?? 0;
                  return (
                <Link
                  key={chapterInfo.chapter.slug}
                  href={`/novel/${slug}/chapter/${chapterInfo.chapter.slug}`}
                  className="block p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors text-xs"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {chapterInfo.chapter.aiSummary ? (
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold" title="AI summary available">
                          AI
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-block w-5 h-5"></span>
                      )}
                      <span className="font-medium truncate">Ch {actualIndex + 1}: {chapterInfo.chapter.name}</span>
                    </div>
                    <span className="text-gray-500 text-xs flex-shrink-0">→</span>
                  </div>
                </Link>
              );
                })}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
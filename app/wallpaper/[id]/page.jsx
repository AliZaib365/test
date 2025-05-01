"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LZString from "lz-string";
import CryptoJS from 'crypto-js';
function WallpaperDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef(null);
  const [wallpaper, setWallpaper] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [blobVideoUrl, setBlobVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState(''); // State for thumbnail
  // New state: downloadActive controls whether to download wallpaper or redirect
  const [downloadActive, setDownloadActive] = useState(true);

  // Fetch wallpaper data from the URL search parameters.
  useEffect(() => {
    const key = searchParams.get("data");
    console.log("Decoded key from URL:", key);
    if (key) {
      // Retrieve the corresponding compressed data from localStorage.
      const storageKey = `wallpaper_${key}`;
      const compressedData = localStorage.getItem(storageKey);
      console.log("Retrieved compressed data from localStorage:", compressedData);
      
      if (compressedData) {
        try {
          // Decompress and decode the data.
          const decompressedData = LZString.decompressFromEncodedURIComponent(compressedData);
          if (!decompressedData) {
            throw new Error("Decompression failed");
          }
          const decodedData = JSON.parse(decompressedData);
          setWallpaper(decodedData);
        } catch (error) {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } else {
      router.push("/");
    }
  }, [searchParams, router]);

  // Set thumbnail URL if wallpaper includes a thumbnail property. Otherwise, use a fallback.
  useEffect(() => {
    if (wallpaper) {
      setThumbnailUrl(wallpaper.thumbnail || '');
    }
  }, [wallpaper]);

  // Once wallpaper is loaded, fetch the media as a blob and create a blob URL for preview.
  useEffect(() => {
    let currentBlobUrl = '';
    let timerId;
    const fetchBlob = async () => {
      if (wallpaper && wallpaper.media) {
        try {
          const proxyUrl = `/api/proxy?url=${encodeURIComponent(wallpaper.media)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error('Failed to fetch media');
          }
          const blob = await response.blob();
          currentBlobUrl = URL.createObjectURL(blob);
          setBlobVideoUrl(currentBlobUrl);

          // Set a timer to revoke the blob URL after 5 seconds
          timerId = setTimeout(() => {
            URL.revokeObjectURL(currentBlobUrl);
            console.log('Blob URL revoked after 5 seconds');
          }, 5000);
        } catch (error) {
          console.error('Error loading media as blob:', error);
        }
      }
    };

    fetchBlob();

    return () => {
      if (timerId) clearTimeout(timerId);
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [wallpaper]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => { });
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Updated download handler using the downloadActive state.
  const handleDownload = () => {
    if (!blobVideoUrl || !wallpaper) return;

    if (downloadActive) {
      // If downloadActive is true, perform download
      const link = document.createElement('a');
      link.href = blobVideoUrl;
      link.download = `${formatName(wallpaper.name)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Else, redirect to a different website (URL to be updated)
      window.location.href = 'https://www.pinterest.com/';
    }
  };

  // Format the wallpaper name for display.
  const formatName = (name) => {
    if (!name) return 'Live_Wallpaper';
    const tags = name.split('#').filter(Boolean);
    const mainTag = tags.length ? tags[0] : 'Live_Wallpaper';
    return mainTag.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, '_').trim();
  };

  const extractTags = (name) => {
    if (!name) return [];
    return name
      .split('#')
      .slice(1)
      .map((tag) =>
        tag.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
      );
  };

  if (!wallpaper || !blobVideoUrl) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = formatName(wallpaper.name);
  const tags = extractTags(wallpaper.name);
  const category = searchParams.get('category') || '';

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 pt-24 pb-16 relative font-sans">
      {/* Back Button positioned properly */}
      <button
        type="button"
        onClick={() => router.back()}
        className="fixed top-15 cursor-pointer left-0 z-50 flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 shadow-md px-4 py-2 rounded-full text-gray-700 hover:text-gray-900 transition duration-200"
        aria-label="Go back"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Video Preview Section */}
      <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden border border-gray-200 shadow-lg bg-gray-50 ">
        <video
          ref={videoRef}
          src={blobVideoUrl}
          muted
          loop
          playsInline
          autoPlay
          poster={thumbnailUrl} // Use thumbnail as the poster image for immediate display
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full max-h-[520px] object-contain bg-black "
          aria-label="Wallpaper preview"
        />
      </div>

      {/* Wallpaper Information */}
      <div className="text-center mt-10">
        <h1 className="text-3xl md:text-5xl font-bold text-gray-800">{displayName}</h1>
        {tags.length > 0 && (
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-sm px-4 py-1 rounded-full bg-gray-200 text-gray-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-10 flex flex-wrap justify-center gap-6">
        <button
          onClick={togglePlay}
          className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white px-6 py-2 rounded-xl shadow-md flex items-center gap-2 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={handleDownload}
          className="bg-gray-800 hover:bg-gray-900 cursor-pointer text-white px-6 py-2 rounded-xl shadow-md flex items-center gap-2 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Download wallpaper"
        >
          Download
        </button>
      </div>
    </div>
  );
}

const PlayIcon = () => (
  <svg
    className="w-5 h-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 4l15 8-15 8V4z" />
  </svg>
);

const PauseIcon = () => (
  <svg
    className="w-5 h-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6" />
  </svg>
);

export default WallpaperDetailPage;
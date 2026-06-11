import React from "react";
import { Modal } from "antd";
import { ASSETS } from "../assets";
const fullicon = ASSETS.images.fullIcon;

// Format any YouTube URL to youtube-nocookie.com embed format
const formatEmbedUrl = (url) => {
    if (!url) return '';
    
    // Extract video ID from various YouTube URL formats
    let videoId = '';
    
    // Match youtube.com/embed/VIDEO_ID (handles single or double slashes)
    const embedMatch = url.match(/youtube\.com\/embed\/+([a-zA-Z0-9_-]+)/);
    // Match youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    // Match youtu.be/VIDEO_ID (handles single or double slashes)
    const shortMatch = url.match(/youtu\.be\/+([a-zA-Z0-9_-]+)/);
    // Match youtube-nocookie.com/embed/VIDEO_ID (handles single or double slashes)
    const nocookieMatch = url.match(/youtube-nocookie\.com\/embed\/+([a-zA-Z0-9_-]+)/);
    
    if (embedMatch) videoId = embedMatch[1];
    else if (watchMatch) videoId = watchMatch[1];
    else if (shortMatch) videoId = shortMatch[1];
    else if (nocookieMatch) videoId = nocookieMatch[1];
    
    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }
    
    return url;
};

function VideoModal({ videoLink, onCancel, isOpen }) {

const rawUrl = videoLink?.link || videoLink?.tmv_link || '';
    const embedUrl = formatEmbedUrl(rawUrl);
    const title = videoLink?.title || videoLink?.tmv_title || "Video Tutorial";

    return (
        <Modal
            open={videoLink}
            centered
            footer={null}
            width={1000}
            className="prescription-pad"
            onCancel={onCancel}
        >
            <div className='use-prescription d-flex w-100 justify-content-between'>
                <h5 className="mb-0">{title}</h5>
                <a href={videoLink?.link} target='_blank' rel="noopener noreferrer">
                    <img src={fullicon} alt="Full screen" />
                </a>
            </div>
            <div className="videodrawer">
                <iframe 
                    width="100%" 
                    height="460" 
                    src={embedUrl} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    referrerPolicy="strict-origin-when-cross-origin" 
                    allowFullScreen
                ></iframe>
            </div>
        </Modal>
    );
}

export default React.memo(VideoModal);

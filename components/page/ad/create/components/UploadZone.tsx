'use client'

import { memo, useRef, useState, useCallback } from 'react';
import { ImagePlus, X, Check } from 'lucide-react';
import { AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";

interface UploadZoneProps {
    label: string;
    hint?: string;
    description?: string;
    notePlaceholder?: string;
    file: AdUploadedComponent | null;
    onChange: (file: AdUploadedComponent | null) => void;
}

function UploadZone({ label, hint, description, notePlaceholder, file, onChange }: UploadZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFiles = useCallback(
        (files: FileList | null) => {
            const file = files?.[0];
            if (!file) {
                return;
            }
            if (!file.type.startsWith('image/')) {
                return;
            }

            const objectUrl = URL.createObjectURL(file);
            const image = new Image();
            image.onload = () => {
                onChange({
                    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    fileName: file.name,
                    previewUrl: objectUrl,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                });
            };
            image.src = objectUrl;
        },
        [onChange],
    );

    const onClickRemove = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            onChange(null);
        },
        [onChange],
    );

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[13px] font-medium text-text1">{label}</span>
                {file && (
                    <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                        <Check className="h-3 w-3 text-accent" strokeWidth={2.4} />
                        attached
                    </span>
                )}
            </div>

            {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas p-2.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.previewUrl} alt={file.fileName} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-text1">{file.fileName}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">
                            ready{file.width && file.height ? ` · ${file.width}×${file.height}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClickRemove}
                        className="rounded-full p-1.5 text-text2 transition-colors hover:bg-surface hover:text-text1"
                        aria-label={`Remove ${label}`}
                    >
                        <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        handleFiles(event.dataTransfer.files);
                    }}
                    className={`group flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 transition-colors ${
                        isDragging ? 'border-accent bg-surface' : 'border-hairline hover:border-text2/50'
                    }`}
                >
                    <ImagePlus className="h-5 w-5 text-text2 transition-colors group-hover:text-text1" strokeWidth={1.8} />
                    <span className="text-[13px] text-text2">
                        Drop an image or <span className="text-text1 underline underline-offset-2">browse</span>
                    </span>
                    {hint && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text2">{hint}</span>}
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = '';
                }}
            />

            {description && !file && (
                <p className="mt-2 text-[12px] leading-relaxed text-text2">{description}</p>
            )}

            {file && notePlaceholder && (
                <input
                    type="text"
                    value={file.note ?? ''}
                    onChange={(event) => {
                        onChange({
                            ...file,
                            note: event.target.value.trim() ? event.target.value : undefined,
                        });
                    }}
                    placeholder={notePlaceholder}
                    className="mt-2 w-full rounded-lg border border-hairline bg-canvas px-3 py-2 text-[12px] text-text1 placeholder:text-text2/60 focus:border-text2/50 focus:outline-none"
                />
            )}
        </div>
    );
}

export default memo(UploadZone);

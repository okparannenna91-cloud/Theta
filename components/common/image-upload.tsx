"use client";

import { FileUpload } from "./file-upload";

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove: () => void;
    disabled?: boolean;
}

export function ImageUpload({ value, onChange, onRemove, disabled }: ImageUploadProps) {
    return (
        <FileUpload
            value={value}
            onChange={onChange}
            onRemove={onRemove}
            disabled={disabled}
            accept="image/*"
            maxSize={25}
            category="image"
        />
    );
}

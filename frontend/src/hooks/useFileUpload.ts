import React, { useState, useRef } from "react";

interface FileUploadResult {
  file: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  error: string;
  setError: (error: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  clearFile: () => void;
}

export function useFileUpload(): FileUploadResult {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Formato inválido. Envie um arquivo PDF.");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Formato inválido. Envie um arquivo PDF.");
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setError("");
  };

  return { file, fileInputRef, error, setError, handleFileChange, handleDrop, clearFile };
}

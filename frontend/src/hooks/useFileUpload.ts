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

  const isArquivoValido = (f: File): boolean => {
    const name = f.name.toLowerCase();
    return (
      f.type === "application/pdf" || name.endsWith(".pdf") ||
      f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || name.endsWith(".xlsx")
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!isArquivoValido(selectedFile)) {
        setError("Formato inválido. Envie um arquivo PDF ou Excel (.xlsx).");
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
      if (isArquivoValido(droppedFile)) {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Formato inválido. Envie um arquivo PDF ou Excel (.xlsx).");
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setError("");
  };

  return { file, fileInputRef, error, setError, handleFileChange, handleDrop, clearFile };
}

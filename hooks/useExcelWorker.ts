/**
 * React Hook: useExcelWorker
 *
 * Purpose: Manage Excel parsing via Web Worker
 * - Non-blocking UI
 * - Progress tracking
 * - Error handling
 * - Automatic cleanup
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RawRow } from '../types';

interface UseExcelWorkerResult {
  parseFile: (file: File) => Promise<RawRow[]>;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  cancel: () => void;
}

interface ChunkMessage {
  type: 'chunk';
  data: RawRow[];
  progress: number;
  chunkIndex: number;
}

interface CompleteMessage {
  type: 'complete';
  totalRows: number;
  totalChunks: number;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

type WorkerResponse = ChunkMessage | CompleteMessage | ErrorMessage;

export const useExcelWorker = (): UseExcelWorkerResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const accumulatedDataRef = useRef<RawRow[]>([]);
  const resolveRef = useRef<((data: RawRow[]) => void) | null>(null);
  const rejectRef = useRef<((error: Error) => void) | null>(null);

  /**
   * Initialize worker
   */
  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    // Create worker from file
    const worker = new Worker(
      new URL('../workers/excel.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      switch (message.type) {
        case 'chunk':
          // Accumulate chunk data
          accumulatedDataRef.current.push(...message.data);
          setProgress(message.progress);
          break;

        case 'complete':
          // Parsing complete
          setIsProcessing(false);
          setProgress(100);

          if (resolveRef.current) {
            resolveRef.current(accumulatedDataRef.current);
            resolveRef.current = null;
          }

          // Reset for next parse
          accumulatedDataRef.current = [];
          break;

        case 'error':
          // Parsing failed
          setIsProcessing(false);
          setError(message.error);

          if (rejectRef.current) {
            rejectRef.current(new Error(message.error));
            rejectRef.current = null;
          }

          // Reset
          accumulatedDataRef.current = [];
          break;
      }
    };

    // Handle worker errors
    worker.onerror = (event) => {
      setIsProcessing(false);
      setError('Worker error: ' + event.message);

      if (rejectRef.current) {
        rejectRef.current(new Error(event.message));
        rejectRef.current = null;
      }

      accumulatedDataRef.current = [];
    };

    workerRef.current = worker;
    return worker;
  }, []);

  /**
   * Parse Excel/CSV file
   */
  const parseFile = useCallback((file: File): Promise<RawRow[]> => {
    return new Promise((resolve, reject) => {
      // Reset state
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      accumulatedDataRef.current = [];

      // Store resolve/reject for later use
      resolveRef.current = resolve;
      rejectRef.current = reject;

      const worker = initWorker();

      // Determine file type
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const fileType = isCSV ? 'csv' : 'excel';

      // Read file
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = e.target?.result;

        if (!data) {
          reject(new Error('Failed to read file'));
          setIsProcessing(false);
          return;
        }

        // Send to worker
        if (isCSV) {
          // CSV: send as string
          worker.postMessage({
            type: 'parse',
            data: data as string,
            fileType: 'csv'
          });
        } else {
          // Excel: send as ArrayBuffer
          worker.postMessage({
            type: 'parse',
            data: data as ArrayBuffer,
            fileType: 'excel'
          });
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
        setIsProcessing(false);
      };

      // Read file based on type
      if (isCSV) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }, [initWorker]);

  /**
   * Cancel current operation
   */
  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setIsProcessing(false);
    setProgress(0);
    accumulatedDataRef.current = [];

    if (rejectRef.current) {
      rejectRef.current(new Error('Operation cancelled'));
      rejectRef.current = null;
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  return {
    parseFile,
    isProcessing,
    progress,
    error,
    cancel
  };
};

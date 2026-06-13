import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Maximize2, Minimize2, Paperclip, X, FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AttachedFile {
  file: File;
  id: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
  onAttachmentsChange?: (files: AttachedFile[]) => void;
  attachments?: AttachedFile[];
  showAttachments?: boolean;
  minHeight?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Напишите что-нибудь...",
  className = "",
  'data-testid': dataTestId,
  onAttachmentsChange,
  attachments = [],
  showAttachments = false,
  minHeight = 200,
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (quillRef.current && dataTestId) {
      const editor = quillRef.current.getEditor();
      const editorContainer = editor.root;
      editorContainer.setAttribute('data-testid', dataTestId);
    }
  }, [dataTestId]);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', reader.result);
          quill.setSelection(range.index + 1, 0);
        }
      };
      reader.readAsDataURL(file);
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['undo', 'redo'],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        ['blockquote', 'code-block'],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
        undo: function() {
          (this as any).quill.history.undo();
        },
        redo: function() {
          (this as any).quill.history.redo();
        },
      },
    },
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true,
    },
  }), [imageHandler]);

  const formats = [
    'font', 'size', 'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'blockquote', 'code-block',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image',
  ];

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onAttachmentsChange) return;
    const newAttachments: AttachedFile[] = [...attachments];
    for (let i = 0; i < files.length; i++) {
      newAttachments.push({
        file: files[i],
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
    }
    onAttachmentsChange(newAttachments);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    if (onAttachmentsChange) {
      onAttachmentsChange(attachments.filter(a => a.id !== id));
    }
  };

  const editorContent = (
    <div className={`rich-text-editor-wrapper ${isFullscreen ? 'rte-fullscreen' : ''} ${className}`}>
      <div className="rte-inner">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="bg-background"
        />

        {showAttachments && attachments.length > 0 && (
          <div className="rte-attachments">
            {attachments.map((att) => (
              <div key={att.id} className="rte-attachment-item" data-testid={`attachment-${att.id}`}>
                <FileIcon className="w-4 h-4 shrink-0" />
                <span className="rte-attachment-name">{att.file.name}</span>
                <span className="rte-attachment-size">{formatFileSize(att.file.size)}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="rte-attachment-remove"
                  data-testid={`button-remove-attachment-${att.id}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="rte-bottom-bar">
          <div className="flex items-center gap-1">
            {showAttachments && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAttachFile}
                  title="Прикрепить файл"
                  data-testid="button-attach-file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelected}
                  data-testid="input-attach-file"
                />
              </>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Свернуть" : "На весь экран"}
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <style>{`
        .rich-text-editor-wrapper {
          position: relative;
        }
        .rte-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          background: hsl(var(--background));
          display: flex;
          flex-direction: column;
          padding: 0;
        }
        .rte-fullscreen .rte-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .rte-fullscreen .quill {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .rte-fullscreen .ql-container {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          border-radius: 0;
        }
        .rte-fullscreen .ql-toolbar {
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
        }
        .rte-fullscreen .ql-editor {
          min-height: 100%;
        }

        .ql-toolbar {
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem 0.375rem 0 0;
          background: hsl(var(--muted));
          flex-wrap: wrap;
        }
        .ql-container {
          border: 1px solid hsl(var(--border));
          border-bottom: none;
          font-family: inherit;
          font-size: 0.875rem;
          min-height: ${minHeight}px;
        }
        .ql-editor {
          min-height: ${minHeight}px;
        }
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .ql-snow .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .ql-snow .ql-fill {
          fill: hsl(var(--foreground));
        }
        .ql-snow .ql-picker-label {
          color: hsl(var(--foreground));
        }
        .ql-snow .ql-picker-options {
          background: hsl(var(--popover));
          border-color: hsl(var(--border));
          color: hsl(var(--popover-foreground));
        }
        .ql-snow .ql-picker-item {
          color: hsl(var(--popover-foreground));
        }
        .ql-toolbar button:hover,
        .ql-toolbar button:focus,
        .ql-toolbar button.ql-active {
          color: hsl(var(--primary));
        }
        .ql-toolbar button:hover .ql-stroke,
        .ql-toolbar button:focus .ql-stroke,
        .ql-toolbar button.ql-active .ql-stroke {
          stroke: hsl(var(--primary));
        }
        .ql-toolbar button:hover .ql-fill,
        .ql-toolbar button:focus .ql-fill,
        .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--primary));
        }
        .ql-toolbar .ql-undo,
        .ql-toolbar .ql-redo {
          position: relative;
        }
        .ql-toolbar .ql-undo::after {
          content: "↶";
          font-size: 18px;
          line-height: 24px;
          color: hsl(var(--foreground));
        }
        .ql-toolbar .ql-redo::after {
          content: "↷";
          font-size: 18px;
          line-height: 24px;
          color: hsl(var(--foreground));
        }
        .ql-toolbar .ql-undo:hover::after,
        .ql-toolbar .ql-redo:hover::after {
          color: hsl(var(--primary));
        }
        .ql-toolbar .ql-undo .ql-stroke,
        .ql-toolbar .ql-redo .ql-stroke {
          display: none;
        }

        .rte-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          border: 1px solid hsl(var(--border));
          border-top: none;
          border-radius: 0 0 0.375rem 0.375rem;
          background: hsl(var(--muted));
        }
        .rte-fullscreen .rte-bottom-bar {
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
        }

        .rte-attachments {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 12px;
          border-left: 1px solid hsl(var(--border));
          border-right: 1px solid hsl(var(--border));
          background: hsl(var(--background));
        }
        .rte-attachment-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 0.25rem;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          font-size: 12px;
          color: hsl(var(--foreground));
          max-width: 250px;
        }
        .rte-attachment-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .rte-attachment-size {
          color: hsl(var(--muted-foreground));
          white-space: nowrap;
        }
        .rte-attachment-remove {
          cursor: pointer;
          padding: 2px;
          border-radius: 2px;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
        }
        .rte-attachment-remove:hover {
          color: hsl(var(--destructive));
        }

        .ql-snow .ql-tooltip {
          background-color: hsl(var(--popover));
          border-color: hsl(var(--border));
          color: hsl(var(--popover-foreground));
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10000;
        }
        .ql-snow .ql-tooltip input[type="text"] {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
        }
        .ql-snow .ql-tooltip a {
          color: hsl(var(--primary));
        }

        .ql-editor img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );

  return editorContent;
}

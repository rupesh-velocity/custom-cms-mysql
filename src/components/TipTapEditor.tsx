'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';

const TipTapEditor = forwardRef<{ insertImage: (url: string) => void }, { content: string, onChange: (html: string, text: string) => void }>(({ content, onChange }, ref) => {
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Underline
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-base focus:outline-none min-h-[400px] p-4 !max-w-none w-full text-[#32373c]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText());
    },
  });

  useImperativeHandle(ref, () => ({
    insertImage: (url: string) => {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }));

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, children }: any) => (
    <button
      onClick={onClick}
      type="button"
      className={`px-2 py-0.5 text-[13px] border rounded-[2px] transition-colors ${
        isActive 
          ? 'bg-[#e5e5e5] border-[#8c8f94] text-[#32373c] shadow-inner' 
          : 'bg-[#f3f5f6] border-[#c3c4c7] text-[#50575e] hover:bg-[#f6f7f7] hover:border-[#8c8f94]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col bg-white h-full relative">
      <div className="bg-[#f1f1f1] border-b border-[#c3c4c7] p-1.5 flex gap-1 flex-wrap items-center sticky top-0 z-10">
        <select
          className="px-2 py-[3px] text-[13px] border border-[#c3c4c7] rounded-[2px] bg-white text-[#32373c] outline-none hover:border-[#8c8f94] cursor-pointer mr-1"
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            editor.isActive('heading', { level: 4 }) ? 'h4' :
            editor.isActive('heading', { level: 5 }) ? 'h5' :
            editor.isActive('heading', { level: 6 }) ? 'h6' :
            editor.isActive('codeBlock') ? 'codeBlock' : 'p'
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
            else if (val === 'h4') editor.chain().focus().toggleHeading({ level: 4 }).run();
            else if (val === 'h5') editor.chain().focus().toggleHeading({ level: 5 }).run();
            else if (val === 'h6') editor.chain().focus().toggleHeading({ level: 6 }).run();
            else if (val === 'codeBlock') editor.chain().focus().toggleCodeBlock().run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
          <option value="codeBlock">Preformatted</option>
        </select>
        
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
          <span className="font-bold font-serif">b</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
          <span className="italic font-serif">i</span>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href;
            setUrlInput(previousUrl || '');
            setShowLinkPrompt(true);
            setShowImagePrompt(false);
          }} 
          isActive={editor.isActive('link')}
        >
          link
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>
          b-quote
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
          <span className="line-through">del</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
          ins
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => {
            setUrlInput('');
            setShowImagePrompt(true);
            setShowLinkPrompt(false);
          }} 
          isActive={editor.isActive('image')}
        >
          img
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
          ul
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
          ol
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={false}>
          li
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')}>
          code
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} isActive={false}>
          more
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} isActive={false}>
          close tags
        </ToolbarButton>
      </div>
      
      {showLinkPrompt && (
        <div className="absolute top-12 left-4 z-20 bg-white border border-[#c3c4c7] shadow-lg p-2 rounded flex gap-2 items-center">
          <input 
            type="text" 
            value={urlInput} 
            onChange={(e) => setUrlInput(e.target.value)} 
            placeholder="Enter link URL..."
            className="border border-[#8c8f94] px-2 py-1 text-[13px] outline-none min-w-[250px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (urlInput) editor.chain().focus().extendMarkRange('link').setLink({ href: urlInput }).run();
                else editor.chain().focus().extendMarkRange('link').unsetLink().run();
                setShowLinkPrompt(false);
              }
            }}
          />
          <button 
            onClick={() => {
              if (urlInput) {
                editor.chain().focus().extendMarkRange('link').setLink({ href: urlInput }).run();
              } else {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
              }
              setShowLinkPrompt(false);
            }}
            className="bg-[#0071a1] text-white px-3 py-1 text-[13px] rounded hover:bg-[#005a80]"
          >Apply</button>
          <button onClick={() => setShowLinkPrompt(false)} className="text-[#b32d2e] px-2 text-[13px] hover:underline">Cancel</button>
        </div>
      )}

      {showImagePrompt && (
        <div className="absolute top-12 left-4 z-20 bg-white border border-[#c3c4c7] shadow-lg p-2 rounded flex gap-2 items-center">
          <input 
            type="text" 
            value={urlInput} 
            onChange={(e) => setUrlInput(e.target.value)} 
            placeholder="Enter image URL..."
            className="border border-[#8c8f94] px-2 py-1 text-[13px] outline-none min-w-[250px]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlInput) {
                editor.chain().focus().setImage({ src: urlInput }).run();
                setShowImagePrompt(false);
              }
            }}
          />
          <button 
            onClick={() => {
              if (urlInput) {
                editor.chain().focus().setImage({ src: urlInput }).run();
              }
              setShowImagePrompt(false);
            }}
            className="bg-[#0071a1] text-white px-3 py-1 text-[13px] rounded hover:bg-[#005a80]"
          >Insert</button>
          <button onClick={() => setShowImagePrompt(false)} className="text-[#b32d2e] px-2 text-[13px] hover:underline">Cancel</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

export default TipTapEditor;

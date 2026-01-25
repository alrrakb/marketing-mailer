"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link as LinkIconLucide, Image as ImageIcon, ArrowRightLeft, Highlighter, Palette, Wand2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import ImageManager from './ImageManager';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ResizableImage from './ResizableImage';

const Toolbar = ({ editor, onImageClick, onRefineClick }: { editor: any, onImageClick: () => void, onRefineClick: () => void }) => {
    if (!editor) {
        return null;
    }

    const addLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    // ... (rest of helper functions like updateBlockAttributes)

    const updateBlockAttributes = (attributes: Record<string, any>) => {
        const { selection } = editor.state;
        // ... (existing logic)
        editor.chain().focus()
            .updateAttributes('paragraph', attributes)
            .updateAttributes('heading', attributes)
            .setMeta('skipAutoDir', true)
            .run();
    };

    const setDirection = (dir: 'rtl' | 'ltr') => {
        const align = dir === 'rtl' ? 'right' : 'left';
        updateBlockAttributes({ dir, textAlign: align });
    };

    const setAlignment = (align: 'left' | 'center' | 'right' | 'justify') => {
        updateBlockAttributes({ textAlign: align });
    };

    const toggleDirection = () => {
        const { from, to } = editor.state.selection;
        let hasRTL = false;
        editor.state.doc.nodesBetween(from, to, (node: any) => {
            if (node.attrs && node.attrs.dir === 'rtl') {
                hasRTL = true;
            }
        });
        setDirection(hasRTL ? 'ltr' : 'rtl');
    };

    const buttonClass = (isActive: boolean) => clsx(
        'p-2 rounded transition-colors duration-200',
        isActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'
    );

    return (
        <div className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700 p-2 flex gap-1 flex-wrap bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-t-lg">
            <button
                type="button"
                onClick={onRefineClick}
                className="p-2 rounded transition-colors duration-200 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 bg-indigo-50/50 dark:bg-indigo-900/10 mr-2"
                title="AI Magic Polish"
            >
                <Wand2 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={buttonClass(editor.isActive('bold'))}
                title="Bold"
            >
                <Bold className="w-4 h-4" />
            </button>
            {/* ... rest of buttons ... */}

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={buttonClass(editor.isActive('italic'))}
                title="Italic"
            >
                <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                type="button"
                onClick={toggleDirection}
                className={buttonClass(false)}
                title="Toggle Direction (RTL/LTR)"
            >
                <ArrowRightLeft className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={buttonClass(editor.isActive('bulletList'))}
                title="Bullet List"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={buttonClass(editor.isActive('orderedList'))}
                title="Numbered List"
            >
                <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                type="button"
                onClick={() => setDirection('ltr')}
                className={buttonClass(editor.isActive({ textAlign: 'left' }))}
                title="Align Left (LTR)"
            >
                <AlignLeft className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => setAlignment('center')}
                className={buttonClass(editor.isActive({ textAlign: 'center' }))}
                title="Align Center"
            >
                <AlignCenter className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => setDirection('rtl')}
                className={buttonClass(editor.isActive({ textAlign: 'right' }))}
                title="Align Right (RTL)"
            >
                <AlignRight className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                type="button"
                onClick={addLink}
                className={buttonClass(editor.isActive('link'))}
                title="Link"
            >
                <LinkIconLucide className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={onImageClick}
                className={buttonClass(false)}
                title="Image"
            >
                <ImageIcon className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleMark('highlight').run()}
                className={buttonClass(editor.isActive('highlight'))}
                title="Highlight"
            >
                <Highlighter className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1 self-center" />
            <label className={clsx(buttonClass(false), "cursor-pointer flex items-center justify-center")}>
                <Palette className="w-4 h-4" style={{ color: editor.getAttributes('textStyle').color || 'inherit' }} />
                <input
                    type="color"
                    className="absolute opacity-0 w-0 h-0"
                    onInput={(event) => editor.chain().focus().setMark('textStyle', { color: (event.target as HTMLInputElement).value }).run()}
                    value={editor.getAttributes('textStyle').color || '#000000'}
                />
            </label>
        </div>
    );
};


interface EditorProps {
    value: string;
    onChange: (html: string) => void;
    onRefine?: () => void;
}


import { Extension } from '@tiptap/core';

const AutoDirection = Extension.create({
    name: 'autoDirection',
    addGlobalAttributes() {
        return [
            {
                types: ['heading', 'paragraph'],
                attributes: {
                    dir: {
                        default: 'auto',
                        parseHTML: element => element.getAttribute('dir'),
                        renderHTML: attributes => {
                            return { dir: attributes.dir }
                        },
                    },
                },
            },
        ];
    },
});

const ImageExtension = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                renderHTML: attributes => {
                    return {
                        width: attributes.width,
                    };
                },
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImage);
    },
});

import { useLanguage } from '@/components/providers/LanguageProvider';

export default function Editor({ value, onChange, onRefine }: EditorProps) {
    const [isImageManagerOpen, setIsImageManagerOpen] = useState(false);
    const { dict, dir } = useLanguage();

    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 hover:text-blue-600 underline',
                },
            }),
            ImageExtension.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Highlight,
            TextStyle,
            Color,
            Color,
            Placeholder.configure({
                placeholder: dict.compose.editor_placeholder,
                emptyEditorClass: clsx(
                    'is-editor-empty relative before:content-[attr(data-placeholder)] before:text-gray-400 before:absolute before:top-0 before:pointer-events-none',
                    dir === 'rtl' ? 'before:right-0' : 'before:left-0'
                ),
            }),
            AutoDirection,
        ],
        immediatelyRender: false,
        content: value,
        onUpdate: ({ editor, transaction }) => {
            const { tr } = editor.state;
            let modified = false;

            // Only run auto-detection if NOT skipped manually
            if (!transaction.getMeta('skipAutoDir')) {
                editor.state.doc.descendants((node, pos) => {
                    if (node.isTextblock && node.content.size > 0) {
                        const text = node.textContent;
                        const isArabic = /^\s*[\u0600-\u06FF]/.test(text);
                        const newDir = isArabic ? 'rtl' : 'ltr';
                        const newAlign = isArabic ? 'right' : 'left';

                        if (node.attrs.dir !== newDir || node.attrs.textAlign !== newAlign) {
                            tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir: newDir, textAlign: newAlign });
                            modified = true;
                        }
                    }
                });

                if (modified) {
                    editor.view.dispatch(tr);
                }
            }

            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'focus:outline-none min-h-[300px] p-4 max-w-none w-full text-base leading-relaxed text-gray-800 dark:text-gray-200'
            }
        }
    });

    // Update content if value changes externally
    useEffect(() => {
        if (editor && value !== undefined && editor.getHTML() !== value) {
            // Fix: We MUST update content even if not empty, otherwise AI Refine won't work
            // Using queue to avoid race conditions with local updates
            if (document.activeElement?.closest('.ProseMirror')) {
                // If user is typing, we might conflict. 
                // But for AI refine, we typically want to overwrite.
                // We can check if the value change is significant or came from AI (not easily passed here).
                // For now, always update if different, but maybe save cursor position?
                // Simple approach: Just set content.

                // If the new value is significantly different (e.g. AI rewrite), we overwrite.
                editor.commands.setContent(value);
            } else {
                editor.commands.setContent(value);
            }
        }
    }, [value, editor]);

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800/40 overflow-hidden transition-colors">
            <Toolbar editor={editor} onImageClick={() => setIsImageManagerOpen(true)} onRefineClick={onRefine || (() => { })} />
            <EditorContent editor={editor} className="bg-white dark:bg-transparent [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:w-full" />
            <ImageManager
                isOpen={isImageManagerOpen}
                onClose={() => setIsImageManagerOpen(false)}
                onSelect={(url) => {
                    editor?.chain().focus().setImage({ src: url }).run();
                }}
            />
            <style>{`
                .ProseMirror p {
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0.5em 0 !important;
                }
                .ProseMirror [dir="rtl"] {
                    direction: rtl;
                }
                .ProseMirror [dir="ltr"] {
                    direction: ltr;
                }
                .ProseMirror ul, .ProseMirror ol {
                    padding-inline-start: 1.5em;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                }
            `}</style>
        </div>
    );
}

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Highlighter,
  Undo2,
  Redo2,
  RemoveFormatting,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function ToolbarBtn({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active
          ? "bg-sky-100 text-sky-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-slate-200 mx-1" />;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Highlight,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[200px] p-4 focus:outline-none text-sm leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content]);

  if (!editor) return null;

  const iconSize = "w-4 h-4";

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-slate-100 bg-slate-50">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <UnderlineIcon className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
        >
          <Strikethrough className={iconSize} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 className={iconSize} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
        >
          <AlignLeft className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
        >
          <AlignCenter className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
        >
          <AlignRight className={iconSize} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered className={iconSize} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
        >
          <Highlighter className={iconSize} />
        </ToolbarBtn>

        <ToolbarDivider />

        <ToolbarBtn
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive("paragraph")}
        >
          <span className="text-xs font-bold font-mono">¶</span>
        </ToolbarBtn>

        <div className="flex-1" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className={iconSize} />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className={iconSize} />
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

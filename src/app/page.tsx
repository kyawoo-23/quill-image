"use client";

import { Delta, DeltaOperation } from "quill";
import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useTransition,
} from "react";
import "react-quill/dist/quill.snow.css";
import { Loader2 } from "lucide-react";
import { deleteFiles, uploadFiles } from "@/app/actions/upload.action";
import dynamic from "next/dynamic";
import ReactQuill, { ReactQuillProps } from "react-quill";
import { toast, Toaster } from "sonner";

type ForwardRefQuillProps = ReactQuillProps & {
  forwardedRef?: React.Ref<ReactQuill>;
};

const DynamicReactQuill = dynamic<ForwardRefQuillProps>(
  async () => {
    const { default: RQ } = await import("react-quill");
    return function comp({ forwardedRef, ...props }: ForwardRefQuillProps) {
      return <RQ ref={forwardedRef} {...props} />;
    };
  },
  { ssr: false }
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export default function Home() {
  const [value, setValue] = useState<string>("");
  const [submittedContent, setSubmittedContent] = useState<string>("");
  const reactQuillRef = useRef<ReactQuill>(null);
  const [oldContents, setOldContents] = useState<Delta | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, startUploading] = useTransition();

  const getImgUrls = (delta: Delta): string[] => {
    return (
      delta.ops
        ?.filter(
          (op: DeltaOperation) =>
            op.insert && typeof op.insert === "object" && "image" in op.insert
        )
        .map((op: DeltaOperation) => (op.insert as { image: string }).image) ||
      []
    );
  };

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(
        `Unsupported file type: ${file.type}. Please upload JPEG, PNG, GIF, or WebP.`
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `File is too large. Maximum file size is ${
          MAX_FILE_SIZE / 1024 / 1024
        }MB.`
      );
      return false;
    }

    return true;
  };

  const uploadImageToCloudStorage = async (file: File): Promise<string> => {
    if (!validateFile(file)) {
      throw new Error("Invalid file");
    }

    const formData = new FormData();
    formData.append("file", file);

    return new Promise((resolve, reject) => {
      startUploading(async () => {
        try {
          const url = await uploadFiles(formData);
          toast.success("Image uploaded successfully");
          resolve(url);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to upload image";
          toast.error(errorMessage);
          reject(error);
        }
      });
    });
  };

  const imageHandler = useCallback(() => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", ALLOWED_IMAGE_TYPES.join(","));
    input.click();
    input.onchange = async () => {
      if (input !== null && input.files !== null) {
        try {
          const file = input.files[0];
          const url = await uploadImageToCloudStorage(file);
          const quill = reactQuillRef.current;
          if (quill) {
            const range = quill.getEditor().getSelection();
            if (range) {
              quill.getEditor().insertEmbed(range.index, "image", url);
              setImageUrls((prev) => [...prev, url]);
            }
          }
        } catch (error) {
          console.error("Image upload failed:", error);
        }
      }
    };
  }, []);

  const handleChange = (content: string) => {
    setValue(content);
    const quill = reactQuillRef.current;
    if (!quill) return;

    const currentDelta = quill.getEditor().getContents();
    const currentImages = getImgUrls(currentDelta);

    if (oldContents) {
      const oldImages = getImgUrls(oldContents);
      const deletedImages = oldImages.filter(
        (oldUrl) => !currentImages.includes(oldUrl)
      );

      if (deletedImages.length > 0) {
        startUploading(async () => {
          try {
            await deleteFiles(deletedImages[0]);
            toast.info("Unused image removed");
          } catch (error) {
            toast.error("Failed to remove unused image");
            console.error("Failed to delete image:", error);
          }
        });
        setImageUrls(currentImages);
      }
    }
    setOldContents(currentDelta);
  };

  const handleSubmit = () => {
    if (!value.trim()) {
      toast.error("Please add some content before submitting");
      return;
    }

    setSubmittedContent(value);
    console.log("Current content:", value);
    console.log("Tracked image URLs:", imageUrls);
    toast.success("Content submitted successfully");
  };

  useEffect(() => {
    const quill = reactQuillRef.current;
    if (quill) {
      const delta = quill.getEditor().getContents();
      setOldContents(delta);
      const initialImages = getImgUrls(delta);
      setImageUrls(initialImages);
    }
  }, []);

  return (
    <div className='space-y-4 max-w-4xl mx-auto p-4'>
      <h1 className='leading-3 text-lg font-bold'>
        React-Quill with image handler
      </h1>
      <Toaster richColors position='top-right' />
      <div className='relative'>
        <DynamicReactQuill
          readOnly={isUploading}
          forwardedRef={reactQuillRef}
          theme='snow'
          placeholder='Start writing...'
          modules={{
            toolbar: {
              container: [
                [{ header: "1" }, { header: "2" }, { font: [] }],
                [{ size: [] }],
                ["bold", "italic", "underline", "strike", "blockquote"],
                [
                  { list: "ordered" },
                  { list: "bullet" },
                  { indent: "-1" },
                  { indent: "+1" },
                ],
                ["link", "image"],
                ["code-block"],
                ["clean"],
              ],
              handlers: {
                image: imageHandler,
              },
            },
            clipboard: {
              matchVisual: false,
            },
          }}
          formats={[
            "header",
            "font",
            "size",
            "bold",
            "italic",
            "underline",
            "strike",
            "blockquote",
            "list",
            "bullet",
            "indent",
            "link",
            "image",
            "code-block",
          ]}
          value={value}
          onChange={handleChange}
        />

        {isUploading && (
          <div className='absolute inset-0 bg-white/50 flex items-center justify-center'>
            <div className='bg-white p-4 rounded-lg shadow-lg space-y-2'>
              <div className='flex items-center space-x-2'>
                <Loader2 className='w-5 h-5 animate-spin text-blue-500' />
                <span>Processing image...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className='space-y-2'>
        <button
          className='py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 
                     disabled:opacity-50 transition-colors duration-200'
          onClick={handleSubmit}
          disabled={isUploading}
        >
          Submit Content
        </button>

        <div className='text-sm text-gray-600'>
          <p>Uploaded Images: {imageUrls.length}</p>
          <ul className='list-disc pl-5'>
            {imageUrls.map((url, index) => (
              <li key={index} className='truncate max-w-md'>
                {url}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {submittedContent && (
        <div className='mt-4 border p-4 rounded-lg bg-gray-50'>
          <h3 className='text-lg font-semibold mb-2'>
            Submitted Content (Raw HTML):
          </h3>
          <pre className='bg-white p-3 rounded-md overflow-x-auto text-sm'>
            {submittedContent}
          </pre>

          <div className='mt-4'>
            <h4 className='text-md font-semibold mb-2'>Rendered Content:</h4>
            <div
              className='prose max-w-full'
              dangerouslySetInnerHTML={{ __html: submittedContent }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

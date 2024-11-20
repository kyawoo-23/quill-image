# React Quill Image Upload with UploadThing

## 🚀 Features

- Rich text editing with React Quill
- Secure image upload and management
- Cloud storage with UploadThing
- File validation and error handling

## 🔧 Setup

### Dependencies

```bash
npm install react-quill uploadthing @uploadthing/react sonner
```

### Environment Variables

```bash
UPLOADTHING_TOKEN=your_token
```

## 📝 Key Implementations

### Image Upload Handler

```typescript
const uploadImageToCloudStorage = async (file: File): Promise<string> => {
  // Validate file type and size
  if (!validateFile(file)) {
    throw new Error("Invalid file");
  }

  const formData = new FormData();
  formData.append("file", file);

  // Upload to UploadThing
  const url = await uploadFiles(formData);
  return url;
};
```

### Server-Side Upload Action

```typescript
// app/actions/upload.action.ts
import { UTApi } from "uploadthing/server";

export async function uploadFiles(formData: FormData) {
  const utapi = new UTApi();
  const file = formData.get("file") as File;

  const response = await utapi.uploadFiles(file);
  return response.data?.url || "";
}

export async function deleteFiles(fileUrl: string) {
  const utapi = new UTApi();
  await utapi.deleteFiles(fileUrl);
}
```

## 🛡️ Validation Constraints

- Supported Formats: JPEG, PNG, GIF, WebP
- Max File Size: 5MB
- Automatic file type checking
- Toast notifications for upload status

## 🔒 Security Features

- Server-side file validation
- Protected upload routes
- Environment variable protection
- Error handling and logging

## 📦 Performance Optimizations

- Uses `useTransition` for non-blocking uploads
- Dynamic React Quill import
- Efficient image URL tracking

## 💡 Usage Example

```typescript
<DynamicReactQuill
  modules={{
    toolbar: {
      handlers: { image: imageHandler },
    },
  }}
  value={content}
  onChange={handleChange}
/>
```

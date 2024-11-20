"use server";

import { utapi } from "@/app/uploadthing";

export async function uploadFiles(formData: FormData) {
  const image = formData?.get("file") as File;
  const res = await utapi.uploadFiles(image);
  if (res.error) {
    throw new Error("Failed to upload image");
  }
  return res.data.url;
}

export async function deleteFiles(url: string) {
  const key = url.split("/").pop();
  if (!key) {
    throw new Error("Invalid URL");
  }
  const res = await utapi.deleteFiles(key);
  return res.success;
}

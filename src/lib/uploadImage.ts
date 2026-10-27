export async function uploadImageFile(
  file: File,
  getToken?: () => Promise<string | undefined>,
  folder: string = 'uploads'
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

  const token = getToken ? await getToken() : undefined;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api-v2/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: dataUrl,
      filename: file.name,
      folder,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.success || !data.url) {
    throw new Error(data.error || 'Image upload failed');
  }
  return data.url as string;
}

export interface Media {
  id: number;
  file_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  alt_text: string | null;
  caption: string | null;
  description: string | null;
  is_archived: boolean;
  uploaded_by: { id: number; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
  pivot_media_type?: string;
}

export interface MediaType {
  id: number;
  name: string;
  label: string;
  allowed_mime: string[];
}

export interface MediaAttachment {
  id: number;
  media_type: string;
  media: Media;
}

export interface MediaInput {
  alt_text?: string;
  caption?: string;
  description?: string;
}

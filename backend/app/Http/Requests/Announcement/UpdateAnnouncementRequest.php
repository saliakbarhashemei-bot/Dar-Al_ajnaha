<?php

namespace App\Http\Requests\Announcement;

use App\Http\Requests\Announcement\Concerns\ValidatesAnnouncementBook;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnnouncementRequest extends FormRequest
{
    use ValidatesAnnouncementBook;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $announcement = $this->route('announcement');
        $announcementId = $announcement?->id;

        // For partial updates, fall back to the stored type so Package 09 still applies.
        $type = $this->input('type', $announcement?->type);
        $bookId = $this->input('book_id', $announcement?->book_id);

        $rules = [
            'title' => ['sometimes', 'string', 'max:255'],
            'slug' => ['nullable', 'string', "unique:announcements,slug,{$announcementId}"],
            'short_description' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'string', 'max:50000'],
            'type' => ['sometimes', 'string', Rule::in(['New Book', 'Reprint', 'New Edition', 'News', 'Event', 'Discount', 'Other'])],
            'status' => ['sometimes', 'string', Rule::in(['Draft', 'Review', 'Scheduled', 'Published', 'Archived'])],
            'book_id' => ['nullable', 'exists:books,id'],
            'scheduled_at' => ['nullable', 'date', 'required_if:status,Scheduled'],
            'published_at' => ['nullable', 'date'],
        ];

        return $this->package09Rules($rules, $type, $bookId);
    }
}

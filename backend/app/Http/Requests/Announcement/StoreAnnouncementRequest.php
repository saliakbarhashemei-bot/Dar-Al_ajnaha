<?php

namespace App\Http\Requests\Announcement;

use App\Http\Requests\Announcement\Concerns\ValidatesAnnouncementBook;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    use ValidatesAnnouncementBook;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:announcements,slug'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'string', 'max:50000'],
            'type' => ['required', 'string', Rule::in(['New Book', 'Reprint', 'New Edition', 'News', 'Event', 'Discount', 'Other'])],
            'status' => ['required', 'string', Rule::in(['Draft', 'Review', 'Scheduled', 'Published', 'Archived'])],
            'book_id' => ['nullable', 'exists:books,id'],
            'scheduled_at' => ['nullable', 'date', 'required_if:status,Scheduled'],
            'published_at' => ['nullable', 'date'],
        ];

        return $this->package09Rules($rules, $this->input('type'), $this->input('book_id'));
    }
}

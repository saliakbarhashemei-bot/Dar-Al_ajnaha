<?php

namespace App\Http\Requests\Book;

use App\Support\WorkflowStates;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'unique:books,slug'],
            'isbn' => ['nullable', 'string', 'regex:/^[0-9Xx][0-9Xx\- ]{8,15}[0-9Xx]$/', 'unique:books,isbn'],
            'description' => ['nullable', 'string', 'max:10000'],
            'page_count' => ['nullable', 'integer', 'min:0'],
            'language' => ['nullable', 'string', 'size:2'],
            'publication_date' => ['nullable', 'date'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'edition' => ['nullable', 'string', 'max:64'],
            'status' => ['required', 'string', Rule::in(WorkflowStates::BOOK_STATUSES)],
            'book_category_id' => ['nullable', 'exists:book_categories,id'],
            'genre' => ['nullable', 'string', 'max:128'],
            'tag_ids' => ['nullable', 'array'],
            'tag_ids.*' => ['exists:tags,id'],
            'contributors' => ['nullable', 'array'],
            'contributors.*.contributor_id' => ['required', 'exists:contributors,id'],
            'contributors.*.contributor_role_id' => ['required_without:contributors.*.role', 'nullable', 'exists:contributor_roles,id'],
            'contributors.*.role' => ['required_without:contributors.*.contributor_role_id', 'nullable', 'string'],
        ];
    }
}

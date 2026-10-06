<?php

namespace App\Http\Requests\Book;

use Illuminate\Foundation\Http\FormRequest;

class AttachBookContributorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contributor_id' => ['required', 'exists:contributors,id'],
            'contributor_role_id' => ['required_without:role', 'nullable', 'exists:contributor_roles,id'],
            'role' => ['required_without:contributor_role_id', 'nullable', 'string'],
        ];
    }
}

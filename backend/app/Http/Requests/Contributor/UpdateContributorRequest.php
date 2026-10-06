<?php

namespace App\Http\Requests\Contributor;

use Illuminate\Foundation\Http\FormRequest;

class UpdateContributorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $contributorId = $this->route('contributor')?->id;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['nullable', 'string', "unique:contributors,slug,{$contributorId}"],
            'biography' => ['nullable', 'string', 'max:5000'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'string', 'max:32'],
            'website' => ['nullable', 'url'],
            'birth_date' => ['nullable', 'date'],
            'nationality' => ['nullable', 'string', 'max:64'],
        ];
    }
}

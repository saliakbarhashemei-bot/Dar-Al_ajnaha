<?php

namespace App\Http\Requests\Book;

use App\Models\ContributorRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DetachBookContributorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contributor_role_id' => [
                'nullable',
                'integer',
                Rule::exists('contributor_roles', 'id'),
            ],
            'role' => [
                'nullable',
                'string',
                Rule::in(ContributorRole::query()->pluck('name')->all()),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'contributor_role_id.exists' => 'The selected contributor role does not exist.',
            'role.in' => 'The selected contributor role is invalid.',
        ];
    }
}

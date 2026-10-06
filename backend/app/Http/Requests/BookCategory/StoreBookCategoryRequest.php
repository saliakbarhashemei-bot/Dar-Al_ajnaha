<?php

namespace App\Http\Requests\BookCategory;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'unique:book_categories,name'],
            'label' => ['required', 'string'],
        ];
    }
}

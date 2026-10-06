<?php

namespace App\Http\Requests\BookCategory;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBookCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('book_category')?->id;

        return [
            'name' => ['sometimes', 'string', "unique:book_categories,name,{$categoryId}"],
            'label' => ['sometimes', 'string'],
        ];
    }
}

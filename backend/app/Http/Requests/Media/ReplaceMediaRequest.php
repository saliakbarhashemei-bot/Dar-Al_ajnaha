<?php

namespace App\Http\Requests\Media;

use App\Http\Requests\Media\Concerns\ValidatesMediaFile;
use App\Support\MediaRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReplaceMediaRequest extends FormRequest
{
    use ValidatesMediaFile;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file'],
            'media_type' => ['required', 'string', Rule::in(MediaRules::names())],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateFileAgainstType(
                $this->file('file'),
                $this->input('media_type'),
                fn ($field, $message) => $validator->errors()->add($field, $message)
            );
        });
    }
}

<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,NULL,id,deleted_at,NULL'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role_ids' => ['required', 'array'],
            'role_ids.*' => ['exists:roles,id'],
        ];
    }
}

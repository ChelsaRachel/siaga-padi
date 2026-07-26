import * as yup from 'yup'

export const loginSchema = yup
  .object({
    email: yup
      .string()
      .email('Format email tidak valid')
      .required('Email wajib diisi'),
    password: yup
      .string()
      .required('Kata sandi wajib diisi'),
  })
  .required()

export type TLoginFormValues = yup.InferType<typeof loginSchema>

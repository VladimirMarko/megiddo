import { oc } from '@orpc/contract'
import { z } from 'zod'

export const GatewayStatusResourceSchemaV1 = z.object({
  service: z.literal('api-gateway'),
  message: z.literal('frontend is connected'),
})

export const TodoResourceSchemaV1 = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  completed: z.boolean(),
})

export const GatewayStatusInputSchemaV1 = z.undefined()
export const TodoListInputSchemaV1 = z.undefined()
export const TodoCreateInputSchemaV1 = z.object({ title: z.string().min(1) })
export const TodoByIdInputSchemaV1 = z.object({ id: z.string().min(1) })
export const TodoRenameInputSchemaV1 = TodoByIdInputSchemaV1.extend({ title: z.string().min(1) })

export type GatewayStatus = z.infer<typeof GatewayStatusResourceSchemaV1>
export type TodoResourceV1 = z.infer<typeof TodoResourceSchemaV1>

export const gatewayStatus = GatewayStatusResourceSchemaV1.parse({
  service: 'api-gateway',
  message: 'frontend is connected',
})

export const apiGatewayContractV1 = {
  v1: {
    gateway: {
      status: oc.input(GatewayStatusInputSchemaV1).output(GatewayStatusResourceSchemaV1),
    },
  },
}

export type ApiGatewayContractV1 = typeof apiGatewayContractV1

export const todoContractV1 = {
  v1: {
    todos: {
      list: oc.input(TodoListInputSchemaV1).output(z.array(TodoResourceSchemaV1)),
      create: oc.input(TodoCreateInputSchemaV1).output(TodoResourceSchemaV1),
      complete: oc.input(TodoByIdInputSchemaV1).output(TodoResourceSchemaV1),
      reopen: oc.input(TodoByIdInputSchemaV1).output(TodoResourceSchemaV1),
      rename: oc.input(TodoRenameInputSchemaV1).output(TodoResourceSchemaV1),
    },
  },
}

export type TodoContractV1 = typeof todoContractV1

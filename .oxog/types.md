@oxog/types - LLM-Native Documentation v1.0.0

PACKAGE OVERVIEW
@oxog/types is the foundational TypeScript package for the @oxog ecosystem, providing zero-dependency type definitions for micro-kernel plugin architecture, functional error handling, and common utilities. Pure TypeScript, no runtime dependencies.

CORE INTERFACES

Plugin<TContext>
Standard plugin interface with lifecycle hooks:
- name: string (unique identifier)
- version: string (semantic version)
- dependencies?: string[] (optional plugin dependencies)
- install: (kernel: Kernel<TContext>) => void (called on registration)
- onInit?: (context: TContext) => MaybePromise<void> (after all plugins)
- onDestroy?: () => MaybePromise<void> (on unregister)
- onError?: (error: Error) => void (error handler)

Kernel<TContext>
Micro-kernel interface for plugin management:
- use(plugin: Plugin<TContext>): this (register plugin)
- unregister(name: string): boolean (remove plugin)
- getPlugin<T>(name: string): T | undefined (retrieve plugin)
- listPlugins(): ReadonlyArray<Plugin> (list all plugins)
- hasPlugin(name: string): boolean (check existence)
- emit<K extends string>(event: K, payload?: unknown): void (emit event)
- on<K extends string>(event: K, handler: (payload: unknown) => void): Unsubscribe (subscribe)
- getContext(): TContext (retrieve shared context)

RESULT TYPE
Rust-inspired Result<T, E> for functional error handling:

Ok<T> Interface:
- ok: true
- value: T
- map<U>(fn: (value: T) => U): Result<U, never>
- mapErr<F>(fn: (error: never) => F): Ok<T>
- match<U>(handlers): U (pattern matching)
- unwrap(): T (assert success)
- unwrapOr(defaultValue: T): T
- unwrapOrElse(fn: () => T): T

Err<E> Interface:
- ok: false
- error: E
- map<U>(fn: (value: never) => U): Err<E>
- mapErr<F>(fn: (error: E) => F): Result<never, F>
- match<U>(handlers): U
- unwrap(): never (throws)
- unwrapOr<T>(defaultValue: T): T
- unwrapOrElse<T>(fn: () => T): T

Factory Functions:
- Ok<T>(value: T): Ok<T>
- Err<E>(error: E): Err<E>

Helpers:
- isOk<T>(result: Result<T, unknown>): result is Ok<T>
- isErr<E>(result: Result<unknown, E>): result is Err<E>
- isResult<T, E>(value: unknown): value is Result<T, E>

ERROR CLASSES
OxogError: Base error class with code and context
- constructor(message: string, code: string, context?: Record<string, unknown>)
- code: string (error code for programmatic handling)
- context?: Record<string, unknown> (additional error context)

ValidationError: Validation-specific errors
- constructor(message: string, context?: Record<string, unknown>)
- Inherits from OxogError with code: ErrorCodes.VALIDATION_ERROR

PluginError: Plugin-related errors
- constructor(message: string, pluginName: string, context?: Record<string, unknown>)
- pluginName: string (name of failing plugin)
- Inherits from OxogError with code: ErrorCodes.PLUGIN_ERROR

ErrorCodes Enum:
- UNKNOWN, VALIDATION_ERROR, PLUGIN_ERROR, NOT_FOUND, TIMEOUT, DEPENDENCY_ERROR

TYPE GUARDS
Runtime type validation functions:
- isPlugin<T>(value: unknown): value is Plugin<T>
- isKernel<T>(value: unknown): value is Kernel<T>
- isOxogError(value: unknown): value is OxogError
- isValidationError(value: unknown): value is ValidationError
- isPluginError(value: unknown): value is PluginError

EVENT SYSTEM
EventMap: Base interface for event payloads
- [event: string]: unknown

EventHandler<TEvents, K>: Type-safe event handler
- (payload: TEvents[K]) => void

TypedEventEmitter<TEvents>: Event emitter interface
- on<K>(event: K, handler): Unsubscribe
- off<K>(event: K, handler): void
- emit<K>(event: K, payload): void
- once<K>(event: K, handler): Unsubscribe

Unsubscribe: () => void (cleanup function)

UTILITY TYPES
Branded<T, B>: Create type-safe identifiers
- type UserId = Branded<string, 'UserId'>
- Prevents accidental type mixing at compile time

DeepPartial<T>: Recursively optional
- DeepReadonly<T>: Recursively readonly
- DeepRequired<T>: Recursively required

MaybePromise<T>: Sync or async values
- T | Promise<T>
- Enables flexible function signatures

Function Types:
- AsyncFunction<T>: (...args: any[]) => Promise<T>
- SyncFunction<T>: (...args: any[]) => T
- AnyFunction: (...args: any[]) => any

JSON Types:
- JsonPrimitive: string | number | boolean | null
- JsonArray: JsonValue[]
- JsonObject: { [key: string]: JsonValue }
- JsonValue: JsonPrimitive | JsonArray | JsonObject

Object Utilities:
- Prettify<T>: Flatten type for better IDE display
- StrictOmit<T, K>: Omit with key validation
- StrictPick<T, K>: Pick with key validation
- NonEmptyArray<T>: [T, ...T[]] (array with at least one element)
- Nullable<T>: T | null
- Optional<T>: T | undefined

CONSTANTS
OXOG_PLUGIN: Symbol.for('@oxog/plugin')
OXOG_KERNEL: Symbol.for('@oxog/kernel')
OXOG_VERSION: '1.0.0'

USAGE PATTERNS

Plugin Development:
const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  dependencies: ['logger'],
  install(kernel) {
    kernel.on('event', (payload) => {
      // Handle event
    });
  },
};

Result Type:
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Err('Division by zero');
  return Ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.value);
}

Error Handling:
try {
  throw new ValidationError('Invalid email', { field: 'email' });
} catch (error) {
  if (isValidationError(error)) {
    console.log(error.context?.field);
  }
}

Branded Types:
type UserId = Branded<string, 'UserId'>;
const userId: UserId = 'user_123' as UserId;

TECHNICAL DETAILS
- Zero runtime dependencies
- TypeScript strict mode
- ES2022 target
- ESM + CJS builds
- 100% test coverage
- Bundle size: < 3KB gzipped
- Universal (Node.js + Browser)
- Node.js >= 18
- TypeScript >= 5.0

EXPORT STRUCTURE
All exports available from './index':
- Plugin<T>, Kernel<T>, PluginOptions, PluginLogger
- Result<T, E>, Ok<T>, Err<E>, Ok(), Err()
- isOk, isErr, isResult
- OxogError, ValidationError, PluginError, ErrorCodes
- isPlugin, isKernel, isOxogError, isValidationError, isPluginError
- EventMap, EventHandler, TypedEventEmitter, Unsubscribe
- Branded, Brand, DeepPartial, DeepReadonly, DeepRequired
- MaybePromise, AsyncFunction, SyncFunction, AnyFunction
- JsonPrimitive, JsonArray, JsonObject, JsonValue
- Prettify, StrictOmit, StrictPick, NonEmptyArray, Nullable, Optional
- OXOG_PLUGIN, OXOG_KERNEL, OXOG_VERSION

LLM OPTIMIZATION
- Predictable API naming
- Comprehensive JSDoc with examples
- Type-safe by default
- No hidden complexity
- Zero dependencies
- Pure TypeScript types
- Minimal runtime code

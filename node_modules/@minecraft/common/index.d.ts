// Type definitions for Minecraft Bedrock Edition script APIs
// Project: https://docs.microsoft.com/minecraft/creator/
// Definitions by: Jake Shirley <https://github.com/JakeShirley>
//                 Mike Ammerlaan <https://github.com/mammerla>

/* *****************************************************************************
   Copyright (c) Microsoft Corporation.
   ***************************************************************************** */
/**
 * @packageDocumentation
 *
 * Manifest Details
 * ```json
 * {
 *   "module_name": "@minecraft/common",
 *   "version": "1.3.0"
 * }
 * ```
 *
 */
/**
 * An enum describing the type of InvalidArgumentError
 */
export enum InvalidArgumentErrorType {
    /**
     * @remarks
     * The argument has a duplicate in this domain.
     *
     */
    Duplicate = 'Duplicate',
    /**
     * @remarks
     * The argument is empty.
     *
     */
    Empty = 'Empty',
    /**
     * @remarks
     * The argument is not the correct type.
     *
     */
    InvalidType = 'InvalidType',
    /**
     * @remarks
     * The argument is unknown in this domain.
     *
     */
    Unknown = 'Unknown',
    /**
     * @remarks
     * No specified error type.
     *
     */
    Unspecified = 'Unspecified',
    /**
     * @remarks
     * The argument is unsupported for this type.
     *
     */
    UnsupportedValue = 'UnsupportedValue',
}

/**
 * Represents a min/max structure for expressing a potential
 * range of numbers.
 */
export interface NumberRange {
    /**
     * @remarks
     * Maximum value within a range.
     *
     */
    max: number;
    /**
     * @remarks
     * Minimum value within a range.
     *
     */
    min: number;
}

/**
 * This type of error is thrown when a parameter to a method or
 * property is out of expected bounds.
 */
// @ts-ignore Class inheritance allowed for native defined classes
export class ArgumentOutOfBoundsError extends Error {
    private constructor();
    /**
     * @remarks
     * This property can be read in early-execution mode.
     *
     */
    readonly index: number;
    /**
     * @remarks
     * Max expected value for the condition.
     *
     * This property can be read in early-execution mode.
     *
     */
    readonly maxValue?: number;
    /**
     * @remarks
     * Min expected value for the condition.
     *
     * This property can be read in early-execution mode.
     *
     */
    readonly minValue?: number;
    /**
     * @remarks
     * Passed-in value for the argument.
     *
     * This property can be read in early-execution mode.
     *
     */
    readonly value?: number;
}

// @ts-ignore Class inheritance allowed for native defined classes
export class ContainerSizeOutOfBoundsError extends Error {
    private constructor();
    /**
     * @remarks
     * This property can be read in early-execution mode.
     *
     */
    readonly maxValue: number;
}

/**
 * Specifies an underlying error in the engine in processing a
 * function.
 */
// @ts-ignore Class inheritance allowed for native defined classes
export class EngineError extends Error {
    private constructor();
}

/**
 * Specifies that a passed-in argument to a method is not
 * correct or allowed.
 */
// @ts-ignore Class inheritance allowed for native defined classes
export class InvalidArgumentError extends Error {
    /**
     * @remarks
     * Index of the argument that is in error.
     *
     * This property can be read in early-execution mode.
     *
     */
    readonly index: number;
    /**
     * @remarks
     * Type of the argument error.
     *
     * This property can be read in early-execution mode.
     *
     */
    readonly type: InvalidArgumentErrorType;
    /**
     * @remarks
     * @param funcName
     * @param argTypeName
     * @param errorType
     * @param argIndex
     */
    constructor(funcName: string, argTypeName: string, errorType: InvalidArgumentErrorType, argIndex?: number);
}

// @ts-ignore Class inheritance allowed for native defined classes
export class PropertyOutOfBoundsError extends Error {
    private constructor();
    /**
     * @remarks
     * This property can be read in early-execution mode.
     *
     */
    readonly maxValue?: number;
    /**
     * @remarks
     * This property can be read in early-execution mode.
     *
     */
    readonly minValue?: number;
    /**
     * @remarks
     * This property can be read in early-execution mode.
     *
     */
    readonly value: number;
}

// @ts-ignore Class inheritance allowed for native defined classes
export class RuntimeConditionError extends Error {
    private constructor();
}

// @ts-ignore Class inheritance allowed for native defined classes
export class UnsupportedFunctionalityError extends Error {
    private constructor();
}

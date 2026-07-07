package com.personal.portfolio.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.List;
import java.util.NoSuchElementException;

/** Turns thrown exceptions into a consistent JSON error response. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex,
                                               HttpServletRequest req) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .toList();
        return ResponseEntity.badRequest()
                .body(ApiError.of("validation_failed", "One or more fields are invalid.",
                        details, req.getRequestURI()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> badArg(IllegalArgumentException ex, HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ApiError.of("bad_request", ex.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiError> notFound(NoHandlerFoundException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("not_found", "No handler for " + ex.getRequestURL(),
                        req.getRequestURI()));
    }

    /** Repository .findById().orElseThrow() throws this when a row is missing. */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiError> noSuchElement(NoSuchElementException ex, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("not_found",
                        ex.getMessage() != null ? ex.getMessage() : "Resource not found.",
                        req.getRequestURI()));
    }

    /** Method-level / @Validated path & param constraint failures. */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> constraint(ConstraintViolationException ex,
                                               HttpServletRequest req) {
        List<String> details = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .toList();
        return ResponseEntity.badRequest()
                .body(ApiError.of("validation_failed",
                        "One or more parameters are invalid.", details, req.getRequestURI()));
    }

    /** Malformed JSON body, wrong types, unexpected shape. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> malformedJson(HttpMessageNotReadableException ex,
                                                  HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ApiError.of("bad_request",
                        "Request body is malformed or missing.", req.getRequestURI()));
    }

    /** Client sent JSON when we asked for multipart (or vice versa). */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> unsupportedMedia(HttpMediaTypeNotSupportedException ex,
                                                     HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(ApiError.of("unsupported_media_type",
                        "Content type not accepted here.", req.getRequestURI()));
    }

    /** @PathVariable / @RequestParam couldn't parse (e.g. "abc" as Long). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException ex,
                                                 HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ApiError.of("bad_request",
                        "Parameter '" + ex.getName() + "' has an invalid value.",
                        req.getRequestURI()));
    }

    /** Missing @RequestParam. */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> missingParam(MissingServletRequestParameterException ex,
                                                 HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ApiError.of("bad_request",
                        "Missing required parameter '" + ex.getParameterName() + "'.",
                        req.getRequestURI()));
    }

    /** Upload exceeded spring.servlet.multipart.max-file-size. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> uploadTooLarge(MaxUploadSizeExceededException ex,
                                                   HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiError.of("file_too_large",
                        "Uploaded file exceeds the configured size limit.",
                        req.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> generic(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception at {}", req.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("internal_error",
                        "Something went wrong on our side.", req.getRequestURI()));
    }
}

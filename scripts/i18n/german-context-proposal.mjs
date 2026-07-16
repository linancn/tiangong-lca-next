const PENDING_CONTEXT_STATUSES = new Set(['BLOCKED_CONTEXT', 'PROPOSED']);

export function validateContextAnnotation(message, annotation, expectedSourceContextHash) {
  if (!annotation) return ['No context proposal exists.'];
  if (typeof annotation !== 'object' || Array.isArray(annotation)) {
    return ['Context proposal must be an object.'];
  }

  const errors = [];
  if (!PENDING_CONTEXT_STATUSES.has(annotation.status)) {
    errors.push('status must be BLOCKED_CONTEXT or PROPOSED before local approval');
  }
  if (typeof annotation.concept !== 'string' || annotation.concept.trim().length === 0) {
    errors.push('concept is required');
  }
  if (typeof annotation.uiRole !== 'string' || annotation.uiRole.trim().length === 0) {
    errors.push('uiRole is required');
  }
  if (typeof annotation.consequence !== 'string' || annotation.consequence.trim().length === 0) {
    errors.push('consequence is required');
  }
  if (!Array.isArray(annotation.evidence) || annotation.evidence.length === 0) {
    errors.push('at least one evidence record is required');
  } else {
    annotation.evidence.forEach((evidence, index) => {
      if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
        errors.push(`evidence[${index}] must be an object`);
        return;
      }
      if (typeof evidence.kind !== 'string' || evidence.kind.trim().length === 0) {
        errors.push(`evidence[${index}].kind is required`);
      }
      if (typeof evidence.reference !== 'string' || evidence.reference.trim().length === 0) {
        errors.push(`evidence[${index}].reference is required`);
      }
      if (typeof evidence.rationale !== 'string' || evidence.rationale.trim().length === 0) {
        errors.push(`evidence[${index}].rationale is required`);
      }
    });
  }
  if (typeof annotation.rationale !== 'string' || annotation.rationale.trim().length === 0) {
    errors.push('rationale is required');
  }
  if (annotation.messageId !== message.id) {
    errors.push(`messageId must equal ${message.id}`);
  }
  if (
    typeof expectedSourceContextHash !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(expectedSourceContextHash)
  ) {
    errors.push('current canonical sourceContextHash is missing or invalid');
  } else if (annotation.sourceContextHash !== expectedSourceContextHash) {
    errors.push('sourceContextHash must match the current canonical source evidence');
  }
  return errors;
}

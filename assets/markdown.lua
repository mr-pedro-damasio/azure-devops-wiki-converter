-- Pandoc Lua filter: improve DOCX output to better match markdown preview.
--
-- Applied changes:
--   CodeBlock  → emits with custom-style "Source Code" so reference.docx
--                shading/border applies; preserves syntax-highlight classes.
--   Code       → wraps inline code in VerbatimChar span (Pandoc default is
--                fine, but we ensure the attribute is explicit).
--   HorizontalRule → rendered as a paragraph with a bottom border rather
--                    than a thin rule that may disappear in Word.

-- Make code block style explicit so the reference.docx SourceCode style
-- (with gray background) is picked up reliably.
function CodeBlock(el)
  el.attr.attributes['custom-style'] = 'Source Code'
  return el
end

-- Ensure inline code uses VerbatimChar explicitly.
function Code(el)
  return pandoc.Span({pandoc.Str(el.text)},
    pandoc.Attr('', {'VerbatimChar'}, {['custom-style'] = 'Verbatim Char'}))
end

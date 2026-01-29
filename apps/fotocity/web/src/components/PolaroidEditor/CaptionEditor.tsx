import { CaptionEditorProps } from './types'
import { FONTS, COLORS } from './fonts'

const MAX_CAPTION_LENGTH = 60

export default function CaptionEditor({
  caption,
  font,
  color,
  onCaptionChange,
  onFontChange,
  onColorChange,
}: CaptionEditorProps) {
  return (
    <div className="caption-editor">
      <div className="caption-input-container">
        <label htmlFor="caption-input">Legenda</label>
        <input
          id="caption-input"
          type="text"
          value={caption}
          onChange={e => onCaptionChange(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
          placeholder="Digite sua legenda..."
          maxLength={MAX_CAPTION_LENGTH}
        />
        <span className="char-count">
          {caption.length}/{MAX_CAPTION_LENGTH}
        </span>
      </div>

      <div className="caption-options">
        <div className="font-selector">
          <label>Fonte</label>
          <div className="font-buttons">
            {FONTS.map(f => (
              <button
                key={f.name}
                type="button"
                className={`font-btn ${font.name === f.name ? 'active' : ''}`}
                style={{ fontFamily: `'${f.family}', cursive` }}
                onClick={() => onFontChange(f)}
                title={f.displayName}
              >
                Aa
              </button>
            ))}
          </div>
        </div>

        <div className="color-selector">
          <label>Cor</label>
          <div className="color-buttons">
            {COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                className={`color-btn ${color.name === c.name ? 'active' : ''}`}
                style={{ backgroundColor: c.hex }}
                onClick={() => onColorChange(c)}
                title={c.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

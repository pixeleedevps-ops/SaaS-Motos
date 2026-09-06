import React, { useId, useMemo, useState } from 'react';

export interface CreatableOption {
  id: string;
  name: string;
}

interface CreatableComboboxProps {
  label: string;
  options: CreatableOption[];
  value: CreatableOption | null;
  onChange: (option: CreatableOption | null) => void;
  onCreate?: (name: string) => Promise<CreatableOption | null>;
  placeholder?: string;
  createLabel?: string;
  required?: boolean;
  disabled?: boolean;
}

export const CreatableCombobox: React.FC<CreatableComboboxProps> = ({
  label,
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  createLabel = 'Crear opción',
  required = false,
  disabled = false,
}) => {
  const inputId = useId();
  const listId = useId();
  const [text, setText] = useState(value?.name || '');
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => {
    setText(value?.name || '');
  }, [value?.id, value?.name]);

  const exactOption = useMemo(
    () => options.find((option) => option.name.trim().toLocaleLowerCase('es') === text.trim().toLocaleLowerCase('es')),
    [options, text],
  );
  const canCreate = Boolean(onCreate && text.trim() && !exactOption && !disabled);

  const selectExactOption = () => {
    if (exactOption && exactOption.id !== value?.id) onChange(exactOption);
  };

  const createOption = async () => {
    if (!onCreate || !canCreate) return;
    setIsCreating(true);
    const created = await onCreate(text.trim());
    setIsCreating(false);
    if (created) {
      onChange(created);
      setText(created.name);
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="block font-bold text-gray-700 mb-1">
        {label}{required ? ' *' : ''}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          list={listId}
          value={text}
          required={required}
          disabled={disabled || isCreating}
          placeholder={placeholder}
          onChange={(event) => {
            const nextText = event.target.value;
            setText(nextText);
            const found = options.find((option) => option.name.trim().toLocaleLowerCase('es') === nextText.trim().toLocaleLowerCase('es')) || null;
            onChange(found);
          }}
          onBlur={selectExactOption}
          className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden disabled:bg-gray-100"
        />
        <datalist id={listId}>
          {options.map((option) => <option key={option.id} value={option.name} />)}
        </datalist>
        {canCreate && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={createOption}
            disabled={isCreating}
            className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
          >
            {isCreating ? 'Creando…' : `+ ${createLabel}`}
          </button>
        )}
      </div>
      {text.trim() && !exactOption && !canCreate && (
        <p className="mt-1 text-[11px] text-amber-700">Selecciona una opción existente.</p>
      )}
    </div>
  );
};

/** « de Beta », « d'Alpha ». */
export const de = (name) => (/^[aeiouyhàâéèêëîïôöûü]/i.test(name) ? `d’${name}` : `de ${name}`);

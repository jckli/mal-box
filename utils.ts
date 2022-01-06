export function intToString(int: number) {
    return int.toString();
}

export function cutString(str: string, len: number) {
    if (str.length > len) {
        return str.substring(0, len - 3) + "...";
    } else {
        return str;
    }
}

export function removeExtraSpaces(str: string) {
    return str.replace(/ {2,}/g, ' ');
}
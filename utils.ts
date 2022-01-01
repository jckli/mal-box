export function intToString(int: number) {
    return int.toString();
}

export function cutString(str: string, len: number) {
    return str.substring(0, len - 3) + "...";
}
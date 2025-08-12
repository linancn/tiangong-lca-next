function check_state_code(old_state_code: number, new_state_code: number) {
  let result = true;
  switch (old_state_code) {
    case 0:
      if (new_state_code !== 20) {
        result = false;
      }
      break;

    case 20:
      if (new_state_code !== 0 && new_state_code !== 100) {
        result = false;
      }
      break;

    case 100:
    case 200:
      result = false;
      break;
  }
  return result;
}

export default check_state_code;

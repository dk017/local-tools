
def debug_log(msg):
    try:
        with open("server_debug.txt", "a") as f:
            f.write(f"{msg}\n")
    except:
        pass

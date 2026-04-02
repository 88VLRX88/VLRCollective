import requests
import config
import sys
import json
import time

class VLRCompany:
    def __init__(self, API: str="http://localhost:1234/api/v1/chat", 
                 history_file: str="./collective/history.txt",
                 full_log_file: str="./collective/full_log.txt",
                 collaborator_file: str="./collective/collaborator.txt",
                 agents: list=config.agents,
                 meta_iterations: int=config.meta_iterations):
        self.API = API
        self.history_file = history_file
        self.full_log_file = full_log_file
        self.collaborator_file = collaborator_file
        self.meta_iterations = meta_iterations
        self.agents = agents

    def _write_file(self, name, text):
        with open(name, "w") as history_file:
            history_file.write(text)
    
    def _update_file(self, name, text):
        with open(name, "a+") as history_file:
            history_file.write(text)

    def _read_file(self, name):
        with open(name, "r+") as history_file:
            return history_file.read()

    def _write_history(self, text):
        return self._write_file(self.history_file, text)

    def _write_collaborator(self, text):
        return self._write_file(self.collaborator_file, text)

    def _update_history(self, name, text):
        return self._update_file(self.history_file ,f"\n{name}===\n {text} \n=====\n")

    def _update_full_log(self, name, text):
        return self._update_file(self.full_log_file ,f"\n{name}===\n {text} \n=====\n")

    def _get_history(self):
       return self._read_file(self.history_file)
    
    def _get_full_history(self):
        return self._read_file(self.full_log_file)

    def _clear(self, filename: str):
        with open(filename, "w") as history_file:
            pass

    def _clean_response(self, content):
        lines = content.split('\n')
        cleaned_lines = [line for line in lines if '===' not in line]
        return '\n'.join(cleaned_lines)
        
    def _structure_history(self):
        history = self._get_history()
        history = history.split(sep="=====")
        if len(history) > config.context_length:
            history.pop(1)
        history = '====='.join(history)
        self._write_history(history)
        
    def _send_request(self, agent: str, history: str, system_prompt: str):
        payload = {
            "model": agent["model"],
            "system_prompt": system_prompt + agent["model"] + f" (Твой характер: {agent["pattern"]}) ",
            "input": history
        }
        headers = {
            "Content-Type": "application/json"
        }
        response = requests.post(self.API, headers=headers, json=payload)
        return response.json()["output"][0]["content"]

    def collaborate(self):
        full_history = self._get_full_history()
        response = self._send_request(config.post_agents["collaborator"], full_history, config.collaborator_prompt)
        self._write_collaborator(response)

    def messaging_pool(self):
        for i in range(self.meta_iterations):
            history = self._get_history()
            for agent in self.agents:
                response = self._send_request(agent, history, config.system_prompt)
                response = self._clean_response(response)
                
                self._update_history(agent["id"], response)
                self._update_full_log(agent["id"], response)
                
                self._structure_history()
                time.sleep(7)
        self.collaborate()
        

def denied():
    return None

def confirm(question, session_id, agents, meta_iterations):

    history_file = f"./collective/{session_id}/history.txt"
    full_log_file = f"./collective/{session_id}/full_log.txt"
    collaborator_file = f"./collective/{session_id}/collaborator.txt"

    collective = VLRCompany(
        history_file=history_file,
        full_log_file=full_log_file,
        collaborator_file=collaborator_file,
        agents=agents,
        meta_iterations=meta_iterations
    )
    collective._clear(collective.history_file)
    collective._clear(collective.full_log_file)
    collective._clear(collective.collaborator_file)

    collective._update_history("USER", question)
    collective._update_full_log("USER", question)

    return collective
    
    




if __name__ == '__main__':
    question = sys.argv[1] if len(sys.argv) > 1 else None
    session_id = sys.argv[2] if len(sys.argv) > 2 else None
    agents = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    meta_iterations = int(sys.argv[4]) if len(sys.argv) > 4 else None
    
    if question and session_id and agents and meta_iterations:
        collective = confirm(question, session_id, agents, meta_iterations)
    else:
        collective = denied()

    if collective is not None:
        collective.messaging_pool()
    else:
        pass

    
    
    
    
    
    
    
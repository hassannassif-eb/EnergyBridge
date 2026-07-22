import React,{useEffect,useState} from "react";

export default function Clients(){

const [clients,setClients]=useState([]);
const [loading,setLoading]=useState(false);

const [form,setForm]=useState({
    client_name:"",
    id:""
});


async function fetchClients(){

    const token=sessionStorage.getItem("authToken");

    const res = await fetch(
        "http://10.249.2.9/api/ip-manager/clients",
        {
            headers:{
                Accept:"application/json",
                Authorization:`Bearer ${token}`
            }
        }
    );


    const data = await res.json();

    console.log("CLIENT RESPONSE", data);

    setClients(data.data || []);

}



async function addClient(e){

    e.preventDefault();

    const client_name = form.client_name.trim();
    const id = form.id.trim();

    if(!client_name || !id){
        showToast("Client name and ID are required","error");
        return;
    }

    setLoading(true);

    try {

        const token = sessionStorage.getItem("authToken");

        console.log("TOKEN:", token);

        const payload = {
            client_name,
            id
        };

        console.log("SENDING:", payload);


        const res = await fetch(
            "http://10.249.2.9/api/ip-manager/clients",
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json",
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                },

                body:JSON.stringify(payload)
            }
        );


        const text = await res.text();

        console.log(
            "STATUS:",
            res.status
        );

        console.log(
            "RAW RESPONSE:",
            text
        );


        let result={};

        try{

            result=JSON.parse(text);

        }catch(e){

            console.log(
                "Response is not JSON"
            );

        }



        if(!res.ok){

            throw new Error(
                result.message ||
                text ||
                "Failed to add client"
            );

        }



        setForm({
            client_name:"",
            id:""
        });


        await fetchClients();


        showToast(
            "Client added successfully",
            "success"
        );


    }catch(err){

        console.error(
            "ADD CLIENT ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );


    }finally{

        setLoading(false);

    }

}



useEffect(()=>{

    fetchClients();

},[]);



return (

<div
className="main-section"
style={{
    width:"100%",
    height:"100%",
    display:"flex",
    flexDirection:"column"
}}
>

<h2>
Clients
</h2>


<form
onSubmit={addClient}
style={{
    display:"flex",
    gap:"12px",
    marginBottom:"20px",
    width:"100%"
}}
>


<input
placeholder="REFERENCE ID"
value={form.id}
onChange={e=>
    setForm({
        ...form,
        id:e.target.value
    })
}
style={{
    flex:"1",
    background:"var(--bg2,#151a21)",
    border:"1px solid var(--border,#303844)",
    color:"var(--text,#fff)",
    padding:"10px",
    borderRadius:"4px",
    fontFamily:"IBM Plex Mono, monospace"
}}
/>


<input
placeholder="Client Name"
value={form.client_name}
onChange={e=>
    setForm({
        ...form,
        client_name:e.target.value
    })
}
style={{
    flex:"1",
    background:"var(--bg2,#151a21)",
    border:"1px solid var(--border,#303844)",
    color:"var(--text,#fff)",
    padding:"10px",
    borderRadius:"4px",
    fontFamily:"IBM Plex Mono, monospace"
}}
/>


<button
disabled={loading}
style={{
    background:"var(--accent,#00b4d8)",
    color:"#fff",
    border:"none",
    padding:"10px 22px",
    borderRadius:"5px",
    fontWeight:"600",
    cursor:"pointer"
}}
>
{
loading
?
"Adding..."
:
"+ Add Client"
}
</button>


</form>




<div
style={{
    width:"100%",
    overflow:"hidden",
    border:"1px solid var(--border,#303844)",
    borderRadius:"6px",
    background:"var(--panel,#161b22)"
}}
>


<div
style={{
    padding:"12px",
    borderBottom:"1px solid var(--border,#303844)",
    color:"var(--text3,#8892a0)",
    fontFamily:"IBM Plex Mono, monospace"
}}
>
Total Clients : {clients.length}
</div>



<table
style={{
    width:"100%",
    borderCollapse:"collapse",
    tableLayout:"fixed"
}}
>


<thead>

<tr
style={{
    background:"rgba(255,255,255,0.03)"
}}
>

<th
style={{
    width:"50%",
    textAlign:"center",
    padding:"12px",
    color:"var(--text,#fff)",
    borderBottom:"1px solid var(--border,#303844)"
}}
>
Reference ID
</th>


<th
style={{
    width:"50%",
    textAlign:"center",
    padding:"12px",
    color:"var(--text,#fff)",
    borderBottom:"1px solid var(--border,#303844)"
}}
>
Client Name
</th>


</tr>

</thead>



<tbody>


{
clients.length ?

clients.map(c=>(

<tr
key={c.id}
style={{
    height:"42px",
    borderBottom:"1px solid var(--border,#303844)"
}}
>


<td
style={{
    width:"50%",
    textAlign:"center",
    padding:"8px"
}}
>

<span
style={{
    background:"rgba(0,180,216,.15)",
    color:"#00b4d8",
    padding:"4px 10px",
    borderRadius:"4px",
    fontFamily:"IBM Plex Mono, monospace",
    fontSize:"12px"
}}
>
{c.id}
</span>

</td>



<td
style={{
    width:"50%",
    textAlign:"center",
    padding:"8px",
    color:"var(--text,#fff)",
    fontWeight:"600"
}}
>

{c.client_name}

</td>


</tr>

))


:

<tr>

<td
colSpan="2"
style={{
    textAlign:"center",
    padding:"30px",
    color:"var(--text3,#8892a0)"
}}
>
No clients
</td>

</tr>

}


</tbody>


</table>


</div>


</div>

);

}